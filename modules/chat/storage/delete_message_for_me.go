package storage

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MongoChatStore) DeleteMessageForMe(ctx context.Context, userID primitive.ObjectID, messageIDs []primitive.ObjectID) error {
	filter := bson.M{
		"_id": bson.M{"$in": messageIDs},
	}

	update := bson.M{
		"$addToSet": bson.M{"deleted_for": userID},
	}

	_, err := s.db.Collection("messages").UpdateMany(ctx, filter, update)
	return err
}
