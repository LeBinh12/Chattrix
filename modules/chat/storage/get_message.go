package storage

import (
	"context"
	"my-app/modules/chat/models"
	ModelUser "my-app/modules/user/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *MongoChatStore) GetMessage(ctx context.Context, SenderID, ReceiverID, GroupID primitive.ObjectID, limit int64, beforeTime *time.Time, afterTime *time.Time, parentID string) ([]models.MessageResponse, error) {
	var filter bson.M

	// Lọc theo group hoặc chat riêng
	if GroupID != primitive.NilObjectID {
		var member struct {
			UpdatedAt time.Time `bson:"updated_at"`
		}
		err := s.db.Collection("group_user_roles").FindOne(ctx, bson.M{
			"group_id":   GroupID.Hex(),
			"user_id":    SenderID.Hex(),
			"is_deleted": bson.M{"$ne": true},
			"role_id":    bson.M{"$ne": ""},
		}).Decode(&member)

		filter = bson.M{
			"group_id":    GroupID,
			"deleted_for": bson.M{"$ne": SenderID},
		}

		if err == nil && !member.UpdatedAt.IsZero() {
			// Chỉ xem được từ thời gian updated_at trở về sau
			filter["created_at"] = bson.M{"$gte": member.UpdatedAt}
		} else if err != nil {
			// Nếu không tìm thấy hoặc đã bị xóa, không cho xem tin nhắn
			return []models.MessageResponse{}, nil
		}
	} else {
		filter = bson.M{
			"$or": []bson.M{
				{"sender_id": SenderID, "receiver_id": ReceiverID},
				{"sender_id": ReceiverID, "receiver_id": SenderID},
			},
			"deleted_for": bson.M{"$ne": SenderID},
		}
	}

	// 🔽 XỬ LÝ THREAD/COMMENT FILTER
	if parentID != "" {
		pID, _ := primitive.ObjectIDFromHex(parentID)
		filter["parent_message_id"] = pID
	} else {
		// Mặc định chỉ lấy tin nhắn cha (không có parent_message_id)
		filter["parent_message_id"] = bson.M{"$exists": false}
	}

	createdAtFilter := bson.M{}

	if beforeTime != nil {
		createdAtFilter["$lt"] = *beforeTime
	}
	if afterTime != nil {
		createdAtFilter["$gt"] = *afterTime
	}

	if len(createdAtFilter) > 0 {
		filter["created_at"] = createdAtFilter
	}

	opst := options.Find().
		SetSort(bson.M{"created_at": -1}). // Mới nhất trước
		SetLimit(limit)

	cursor, err := s.db.Collection("messages").Find(ctx, filter, opst)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var messages []models.Message
	if err := cursor.All(ctx, &messages); err != nil {
		return nil, err
	}

	if len(messages) == 0 {
		return []models.MessageResponse{}, nil
	}

	//  Lấy danh sách sender_id duy nhất
	senderIDsMap := map[primitive.ObjectID]struct{}{}
	for _, msg := range messages {
		senderIDsMap[msg.SenderID] = struct{}{}
	}

	var senderIDs []primitive.ObjectID
	for id := range senderIDsMap {
		senderIDs = append(senderIDs, id)
	}

	//  Query tất cả users
	userCursor, err := s.db.Collection("users").Find(ctx, bson.M{"_id": bson.M{"$in": senderIDs}})
	if err != nil {
		return nil, err
	}
	var users []ModelUser.User
	if err := userCursor.All(ctx, &users); err != nil {
		return nil, err
	}
	userMap := make(map[primitive.ObjectID]ModelUser.User)
	for _, u := range users {
		userMap[u.ID] = u
	}

	allMediaIDsMap := map[primitive.ObjectID]struct{}{}
	for _, msg := range messages {
		for _, mID := range msg.MediaIDs {
			allMediaIDsMap[mID] = struct{}{}
		}
		if msg.Task != nil {
			for _, mID := range msg.Task.AttachmentIDs {
				allMediaIDsMap[mID] = struct{}{}
			}
		}
	}

	var allMediaIDs []primitive.ObjectID
	for id := range allMediaIDsMap {
		allMediaIDs = append(allMediaIDs, id)
	}

	//  Query tất cả medias dựa trên _id
	mediaMap := map[primitive.ObjectID]models.Media{}
	if len(allMediaIDs) > 0 {
		mediaCursor, err := s.db.Collection("medias").Find(ctx, bson.M{"_id": bson.M{"$in": allMediaIDs}})
		if err == nil {
			var medias []models.Media
			if err := mediaCursor.All(ctx, &medias); err == nil {
				for _, m := range medias {
					mediaMap[m.ID] = m
				}
			}
		}
	}

	// 🔽 ĐẾM SỐ COMMENT CHO MỖI TIN NHẮN
	commentCounts := make(map[primitive.ObjectID]int)
	if len(messages) > 0 {
		msgIDs := make([]primitive.ObjectID, len(messages))
		for i, m := range messages {
			msgIDs[i] = m.ID
		}

		commentCursor, err := s.db.Collection("messages").Aggregate(ctx, []bson.D{
			{{"$match", bson.M{"parent_message_id": bson.M{"$in": msgIDs}}}},
			{{"$group", bson.M{"_id": "$parent_message_id", "count": bson.M{"$sum": 1}}}},
		})
		if err == nil {
			var results []struct {
				ID    primitive.ObjectID `bson:"_id"`
				Count int                `bson:"count"`
			}
			if err := commentCursor.All(ctx, &results); err == nil {
				for _, res := range results {
					commentCounts[res.ID] = res.Count
				}
			}
			commentCursor.Close(ctx)
		}
	}

	//  Ghép dữ liệu thành MessageResponse
	var messageResponses []models.MessageResponse
	for _, msg := range messages {
		res := models.MessageResponse{
			ID:           msg.ID,
			SenderID:     msg.SenderID,
			ReceiverID:   msg.ReceiverID,
			GroupID:      msg.GroupID,
			Content:      msg.Content,
			CreatedAt:    msg.CreatedAt,
			Status:       msg.Status,
			IsRead:       msg.IsRead,
			Type:         msg.Type,
			RecalledAt:   msg.RecalledAt,
			RecalledBy:   msg.RecalledBy,
			Task:         msg.Task,
			Reactions:    msg.Reactions,
			EditedAt:     msg.EditedAt,
			CommentCount: commentCounts[msg.ID],
		}

		if msg.ParentMessageID != nil {
			res.ParentID = msg.ParentMessageID.Hex()
		}

		if user, ok := userMap[msg.SenderID]; ok {
			res.SenderName = user.DisplayName
			res.SenderAvatar = user.Avatar
		} else {
			res.SenderName = "Unknown"
			res.SenderAvatar = "/assets/logo.png"
		}

		// Gán media
		for _, mID := range msg.MediaIDs {
			if m, ok := mediaMap[mID]; ok {
				res.MediaIDs = append(res.MediaIDs, m)
			}
		}

		// Gán attachments cho task
		if res.Task != nil && len(res.Task.AttachmentIDs) > 0 {
			res.Task.Attachments = []models.Media{}
			for _, mID := range res.Task.AttachmentIDs {
				if m, ok := mediaMap[mID]; ok {
					res.Task.Attachments = append(res.Task.Attachments, m)
				}
			}
		}
		// --- XỬ LÝ REPLY ---
		if msg.Reply.ID != primitive.NilObjectID {
			res.Reply = models.ReplyMessageMini{
				ID:       msg.Reply.ID,
				Sender:   msg.Reply.Sender,
				Content:  msg.Reply.Content,
				Type:     msg.Reply.Type,
				MediaUrl: msg.Reply.MediaUrl,
			}
		}

		messageResponses = append(messageResponses, res)
	}

	return messageResponses, nil
}
