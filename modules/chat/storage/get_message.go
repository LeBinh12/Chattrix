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
		// Kiểm tra quyền thành viên (phải là thành viên hiện tại)
		err := s.db.Collection("group_user_roles").FindOne(ctx, bson.M{
			"group_id":   GroupID.Hex(),
			"user_id":    SenderID.Hex(),
			"is_deleted": bson.M{"$ne": true},
			"role_id":    bson.M{"$ne": ""},
		}).Err()

		if err != nil {
			// Nếu không tìm thấy hoặc không phải thành viên, không cho xem tin nhắn
			return []models.MessageResponse{}, nil
		}

		filter = bson.M{
			"group_id":    GroupID,
			"deleted_for": bson.M{"$ne": SenderID},
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

	// 🔽 LẤY DỮ LIỆU SEEN
	seenByMap := make(map[primitive.ObjectID][]models.SeenUserInfo)
	seenByCountMap := make(map[primitive.ObjectID]int)
	var conversationID primitive.ObjectID
	if GroupID != primitive.NilObjectID {
		conversationID = GroupID
	} else {
		conversationID = GetConversationID(SenderID, ReceiverID)
	}

	seenCursor, err := s.db.Collection("chat_seen_status").Find(ctx, bson.M{"conversation_id": conversationID}, options.Find().SetSort(bson.M{"updated_at": -1}))
	if err == nil {
		var seenStatuses []models.ChatSeenStatus
		if err := seenCursor.All(ctx, &seenStatuses); err == nil {
			// Thu thập tất cả user IDs đã seen
			seenUserIDsMap := make(map[primitive.ObjectID]struct{})
			for _, status := range seenStatuses {
				seenUserIDsMap[status.UserID] = struct{}{}
			}

			// Fetch user info cho những người đã seen (có thể dùng userMap nếu đã có)
			for uID := range seenUserIDsMap {
				if _, ok := userMap[uID]; !ok {
					// Nếu chưa có trong userMap (sender map), thì fetch thêm
					var u ModelUser.User
					if err := s.db.Collection("users").FindOne(ctx, bson.M{"_id": uID}).Decode(&u); err == nil {
						userMap[uID] = u
					}
				}
			}
			// Find requester's last seen ID
			var requesterLastSeenID primitive.ObjectID
			for _, status := range seenStatuses {
				if status.UserID == SenderID {
					requesterLastSeenID = status.LastSeenMessageID
					break
				}
			}

			// Map seen users vào từng message
			for i := range messages {
				msg := &messages[i]
				var messageSeenBy []models.SeenUserInfo
				count := 0
				for _, status := range seenStatuses {
					// Nếu last_seen_message_id của user >= ID của message này (hoặc cùng ID)
					if status.UserID != msg.SenderID && (status.LastSeenMessageID == msg.ID || status.LastSeenMessageID.Timestamp().After(msg.ID.Timestamp()) || status.LastSeenMessageID.Hex() == msg.ID.Hex()) {
						count++
						// Chỉ lấy tối đa 6 người để hiển thị ban đầu
						if len(messageSeenBy) < 6 {
							if u, ok := userMap[status.UserID]; ok {
								messageSeenBy = append(messageSeenBy, models.SeenUserInfo{
									ID:          u.ID,
									DisplayName: u.DisplayName,
									Avatar:      u.Avatar,
								})
							}
						}
					}
				}
				seenByMap[msg.ID] = messageSeenBy
				seenByCountMap[msg.ID] = count

				// 🔹 Determine IsRead for the requester
				if msg.SenderID == SenderID {
					msg.IsRead = true
				} else if !requesterLastSeenID.IsZero() {
					if requesterLastSeenID == msg.ID || requesterLastSeenID.Timestamp().After(msg.ID.Timestamp()) || requesterLastSeenID.Hex() == msg.ID.Hex() {
						msg.IsRead = true
					} else {
						msg.IsRead = false
					}
				} else {
					msg.IsRead = false
				}
			}
		}
		seenCursor.Close(ctx)
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
			SeenBy:       seenByMap[msg.ID],
			SeenByCount:  seenByCountMap[msg.ID],
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
