package storage

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// AddReaction adds a new reaction to the message
func (s *MongoChatStore) AddReaction(ctx context.Context, messageID primitive.ObjectID, reaction models.Reaction) error {
	filter := bson.M{"_id": messageID}
	update := bson.M{
		"$push": bson.M{
			"reactions": reaction,
		},
	}

	_, err := s.db.Collection("messages").UpdateOne(ctx, filter, update)
	return err
}

// RemoveReaction removes a reaction from the message
func (s *MongoChatStore) RemoveReaction(ctx context.Context, messageID primitive.ObjectID, userID primitive.ObjectID, emoji string) error {
	filter := bson.M{"_id": messageID}
	update := bson.M{
		"$pull": bson.M{
			"reactions": bson.M{
				"user_id": userID,
				"emoji":   emoji,
			},
		},
	}

	_, err := s.db.Collection("messages").UpdateOne(ctx, filter, update)
	return err
}

// Ensure Reaction struct has the required fields
func (s *MongoChatStore) GetMessageReactions(ctx context.Context, messageID primitive.ObjectID) ([]models.Reaction, error) {
	var message models.Message
	filter := bson.M{"_id": messageID}
	err := s.db.Collection("messages").FindOne(ctx, filter).Decode(&message)
	if err != nil {
		return nil, err
	}
	return message.Reactions, nil
}

// FindReaction checks if a user has already reacted with a specific emoji on a message
func (s *MongoChatStore) FindReaction(ctx context.Context, messageID primitive.ObjectID, userID primitive.ObjectID, emoji string) (*models.Reaction, error) {
	filter := bson.M{
		"_id": messageID,
		"reactions": bson.M{
			"$elemMatch": bson.M{
				"user_id": userID,
				"emoji":   emoji,
			},
		},
	}

	var message models.Message
	err := s.db.Collection("messages").FindOne(ctx, filter).Decode(&message)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	for _, r := range message.Reactions {
		if r.UserID == userID && r.Emoji == emoji {
			return &r, nil
		}
	}

	return nil, nil
}

// RemoveAllReactionsByUser removes all reactions of a user from all messages
func (s *MongoChatStore) RemoveAllReactionsByUser(
	ctx context.Context,
	messageID primitive.ObjectID,
	userID primitive.ObjectID,
) error {

	filter := bson.M{
		"_id":               messageID,
		"reactions.user_id": userID,
	}

	update := bson.M{
		"$pull": bson.M{
			"reactions": bson.M{
				"user_id": userID,
			},
		},
	}

	_, err := s.db.
		Collection("messages").
		UpdateMany(ctx, filter, update)

	return err
}
