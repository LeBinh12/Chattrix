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

func (s *MongoChatStore) GetMessage(ctx context.Context, SenderID, ReceiverID, GroupID primitive.ObjectID, limit int64, beforeTime *time.Time) ([]models.MessageResponse, error) {
	var filter bson.M

	// Lọc theo group hoặc chat riêng
	if GroupID != primitive.NilObjectID {
		filter = bson.M{"group_id": GroupID}
	} else {
		filter = bson.M{
			"$or": []bson.M{
				{"sender_id": SenderID, "receiver_id": ReceiverID},
				{"sender_id": ReceiverID, "receiver_id": SenderID},
			},
		}
	}

	if beforeTime != nil {
		filter["created_at"] = bson.M{"$lt": *beforeTime}
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

	// 3️⃣ Lấy danh sách sender_id duy nhất
	senderIDsMap := map[primitive.ObjectID]struct{}{}
	for _, msg := range messages {
		senderIDsMap[msg.SenderID] = struct{}{}
	}

	var senderIDs []primitive.ObjectID
	for id := range senderIDsMap {
		senderIDs = append(senderIDs, id)
	}

	// 4️⃣ Query tất cả users
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

	// 5️⃣ Thu thập tất cả mediaIDs
	allMediaIDsMap := map[primitive.ObjectID]struct{}{}
	for _, msg := range messages {
		for _, mID := range msg.MediaIDs {
			allMediaIDsMap[mID] = struct{}{}
		}
	}

	var allMediaIDs []primitive.ObjectID
	for id := range allMediaIDsMap {
		allMediaIDs = append(allMediaIDs, id)
	}

	// 6️⃣ Query tất cả medias dựa trên _id
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

	// 7️⃣ Ghép dữ liệu thành MessageResponse
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

		messageResponses = append(messageResponses, res)
	}

	return messageResponses, nil
}
