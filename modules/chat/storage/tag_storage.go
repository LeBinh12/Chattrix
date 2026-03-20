package storage

import (
	"context"
	"my-app/modules/chat/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *MongoChatStore) UpsertTags(ctx context.Context, tag *models.ConversationTag) error {
	collection := s.db.Collection("conversation_tags")
	opts := options.Update().SetUpsert(true)

	filter := bson.M{
		"user_id":   tag.UserID,
		"target_id": tag.TargetID,
	}

	update := bson.M{
		"$set": bson.M{
			"is_group":   tag.IsGroup,
			"tags":       tag.Tags,
			"updated_at": time.Now(),
		},
		"$setOnInsert": bson.M{
			"created_at": time.Now(),
		},
	}

	_, err := collection.UpdateOne(ctx, filter, update, opts)
	return err
}

func (s *MongoChatStore) GetTags(ctx context.Context, userID primitive.ObjectID) ([]models.ConversationTag, error) {
	collection := s.db.Collection("conversation_tags")
	filter := bson.M{"user_id": userID}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var tags []models.ConversationTag
	if err = cursor.All(ctx, &tags); err != nil {
		return nil, err
	}
	return tags, nil
}
func (s *MongoChatStore) GetTargetIDsByTags(ctx context.Context, userID primitive.ObjectID, tags []string) ([]primitive.ObjectID, error) {
	collection := s.db.Collection("conversation_tags")
	filter := bson.M{
		"user_id": userID,
		"tags":    bson.M{"$in": tags},
	}

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var targetIDs []primitive.ObjectID
	for cursor.Next(ctx) {
		var t models.ConversationTag
		if err := cursor.Decode(&t); err != nil {
			return nil, err
		}
		targetIDs = append(targetIDs, t.TargetID)
	}

	return targetIDs, nil
}
