package storage

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MongoChatStore) GetGroupMembers(ctx context.Context, groupID primitive.ObjectID) ([]primitive.ObjectID, error) {

	var members []struct {
		UserID primitive.ObjectID `bson:"user_id"`
	}

	filter := bson.M{
		"group_id": groupID,
		"status":   "active",
	}

	cursor, err := s.db.Collection("group_members").Find(ctx, filter)
	if err != nil {
		return nil, err
	}

	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &members); err != nil {
		return nil, err
	}

	userIDs := make([]primitive.ObjectID, 0, len(members))
	for _, m := range members {
		userIDs = append(userIDs, m.UserID)
	}

	return userIDs, nil
}
