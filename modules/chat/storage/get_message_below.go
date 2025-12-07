package storage

import (
	"context"
	"my-app/modules/chat/models"
	ModelGroup "my-app/modules/group/models"
	ModelUser "my-app/modules/user/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *MongoChatStore) GetMessageBelow(
	ctx context.Context,
	SenderID, ReceiverID, GroupID primitive.ObjectID,
	limit int64,
	afterTime time.Time,
) ([]models.MessageResponse, error) {

	var filter bson.M

	// 1. Lọc theo group hoặc chat riêng
	if GroupID != primitive.NilObjectID {
		var member ModelGroup.GroupMember
		err := s.db.Collection("group_members").FindOne(ctx, bson.M{
			"group_id": GroupID,
			"user_id":  SenderID,
		}).Decode(&member)
		if err != nil {
			return []models.MessageResponse{}, nil
		}

		filter = bson.M{
			"group_id":    GroupID,
			"created_at":  bson.M{"$gte": member.JoinedAt, "$gt": afterTime},
			"deleted_for": bson.M{"$ne": SenderID},
		}

	} else {
		filter = bson.M{
			"$or": []bson.M{
				{"sender_id": SenderID, "receiver_id": ReceiverID},
				{"sender_id": ReceiverID, "receiver_id": SenderID},
			},
			"created_at":  bson.M{"$gt": afterTime},
			"deleted_for": bson.M{"$ne": SenderID},
		}
	}

	// 2. Query messages
	opts := options.Find().
		SetSort(bson.M{"created_at": 1}). // Sort tăng để scroll xuống
		SetLimit(limit)

	cursor, err := s.db.Collection("messages").Find(ctx, filter, opts)
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

	// 3. Lấy danh sách sender_id duy nhất
	senderIDsMap := map[primitive.ObjectID]struct{}{}
	allMediaIDsMap := map[primitive.ObjectID]struct{}{}
	for _, msg := range messages {
		senderIDsMap[msg.SenderID] = struct{}{}
		for _, mID := range msg.MediaIDs {
			allMediaIDsMap[mID] = struct{}{}
		}
	}

	var senderIDs []primitive.ObjectID
	for id := range senderIDsMap {
		senderIDs = append(senderIDs, id)
	}

	var allMediaIDs []primitive.ObjectID
	for id := range allMediaIDsMap {
		allMediaIDs = append(allMediaIDs, id)
	}

	// 4. Query users
	userCursor, err := s.db.Collection("users").Find(ctx, bson.M{"_id": bson.M{"$in": senderIDs}})
	if err != nil {
		return nil, err
	}
	defer userCursor.Close(ctx)

	var users []ModelUser.User
	if err := userCursor.All(ctx, &users); err != nil {
		return nil, err
	}

	userMap := make(map[primitive.ObjectID]ModelUser.User)
	for _, u := range users {
		userMap[u.ID] = u
	}

	// 5. Query medias
	mediaMap := map[primitive.ObjectID]models.Media{}
	if len(allMediaIDs) > 0 {
		mediaCursor, err := s.db.Collection("medias").Find(ctx, bson.M{"_id": bson.M{"$in": allMediaIDs}})
		if err == nil {
			defer mediaCursor.Close(ctx)
			var medias []models.Media
			if err := mediaCursor.All(ctx, &medias); err == nil {
				for _, m := range medias {
					mediaMap[m.ID] = m
				}
			}
		}
	}

	// 6. Ghép dữ liệu thành MessageResponse ngay tại đây
	var messageResponses []models.MessageResponse
	for _, msg := range messages {
		res := models.MessageResponse{
			ID:         msg.ID,
			SenderID:   msg.SenderID,
			ReceiverID: msg.ReceiverID,
			GroupID:    msg.GroupID,
			Content:    msg.Content,
			CreatedAt:  msg.CreatedAt,
			Status:     msg.Status,
			IsRead:     msg.IsRead,
			Type:       msg.Type,
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

		// Xử lý reply trực tiếp
		if msg.Reply.ID != primitive.NilObjectID {
			senderName := msg.Reply.Sender
			if replyUser, ok := userMap[msg.Reply.ID]; ok {
				senderName = replyUser.DisplayName
			}
			res.Reply = models.ReplyMessageMini{
				ID:       msg.Reply.ID,
				Sender:   senderName,
				Content:  msg.Reply.Content,
				Type:     msg.Reply.Type,
				MediaUrl: msg.Reply.MediaUrl,
			}
		}

		messageResponses = append(messageResponses, res)
	}

	return messageResponses, nil
}
