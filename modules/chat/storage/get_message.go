package storage

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *MongoChatStore) GetMessage(ctx context.Context, SenderID, ReceiverID primitive.ObjectID, limit, skip int64) ([]models.Message, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"sender_id": SenderID, "receiver_id": ReceiverID},
			{"sender_id": ReceiverID, "receiver_id": SenderID},
		},
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

	return messages, nil
}
