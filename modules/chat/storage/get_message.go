package storage

import (
	"context"
	"my-app/modules/chat/models"
	ModelUser "my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *MongoChatStore) GetMessage(ctx context.Context, SenderID, ReceiverID, GroupID primitive.ObjectID, limit, skip int64) ([]models.MessageResponse, error) {
	var filter bson.M

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

	opst := options.Find().SetSort(bson.M{"created_at": -1}).
		SetLimit(limit).
		SetSkip(skip)

	cursor, err := s.db.Collection("messages").Find(ctx, filter, opst)

	if err != nil {
		return nil, err
	}

	defer cursor.Close(ctx)

	var messages []models.Message
	if err := cursor.All(ctx, &messages); err != nil {
		return nil, err
	}

	// Lấy danh sách sender_id duy nhất
	senderIDsMap := map[primitive.ObjectID]struct{}{}
	for _, msg := range messages {
		senderIDsMap[msg.SenderID] = struct{}{}
	}

	var senderIDs []primitive.ObjectID
	for id := range senderIDsMap {
		senderIDs = append(senderIDs, id)
	}

	//  Query tất cả users một lần

	userCursor, err := s.db.Collection("users").Find(ctx, bson.M{"_id": bson.M{"$in": senderIDs}})
	if err != nil {
		return nil, err
	}

	var users []ModelUser.User
	if err := userCursor.All(ctx, &users); err != nil {
		return nil, err
	}

	//  Map user_id -> User
	userMap := make(map[primitive.ObjectID]ModelUser.User)
	for _, u := range users {
		userMap[u.ID] = u
	}

	//Gán vào messages
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
		}

		if msg.GroupID != primitive.NilObjectID {
			if user, ok := userMap[msg.SenderID]; ok {
				res.SenderName = user.DisplayName
				res.SenderAvatar = user.Avatar
			} else {
				res.SenderName = "Unknown"
				res.SenderAvatar = "/assets/logo.png"
			}
		}

		messageResponses = append(messageResponses, res)

	}
	return messageResponses, nil

}
