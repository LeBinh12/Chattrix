package storage

import (
	"context"
	"my-app/modules/chat/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *MongoChatStore) FindByUserAndConversation(ctx context.Context, userID, conversationID primitive.ObjectID) (*models.ChatSeenStatus, error) {
	var seen models.ChatSeenStatus

	err := s.db.Collection("chat_seen_status").FindOne(ctx, bson.M{
		"user_id":         userID,
		"conversation_id": conversationID,
	}).Decode(&seen)

	if err != nil {
		return nil, nil
	}

	return &seen, nil
}

func (s *MongoChatStore) CreateOrUpdate(ctx context.Context,
	userID, conversationID, lastSeenMsgID primitive.ObjectID) error {
	filter := bson.M{
		"user_id":         userID,
		"conversation_id": conversationID,
	}

	update := bson.M{
		"$set": bson.M{
			"last_seen_message_id": lastSeenMsgID,
			"updated_at":           time.Now(),
		},
	}

	opts := options.Update().SetUpsert(true)

	_, err := s.db.Collection("chat_seen_status").UpdateOne(ctx, filter, update, opts)

	return err
}
