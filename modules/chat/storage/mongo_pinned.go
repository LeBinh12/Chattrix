package storage

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *MongoChatStore) CreatePinnedMessage(ctx context.Context, p *models.PinnedMessage) error {
	filter := bson.M{
		"conversation_id": p.ConversationID,
		"message_id":      p.MessageID,
	}

	update := bson.M{
		"$set": bson.M{
			"pinned_by": p.PinnedBy,
			"pinned_at": p.PinnedAt,
			"note":      p.Note,
		},
		"$setOnInsert": bson.M{
			"_id": p.ID,
		},
	}

	_, err := s.db.Collection("pinned_messages").UpdateOne(
		ctx,
		filter,
		update,
		options.Update().SetUpsert(true),
	)

	return err
}

func (s *MongoChatStore) UnpinMessage(
	ctx context.Context,
	conversationID, messageID primitive.ObjectID,
) error {

	filter := bson.M{
		"conversation_id": conversationID,
		"message_id":      messageID,
	}

	_, err := s.db.Collection("pinned_messages").DeleteOne(ctx, filter)
	return err
}
