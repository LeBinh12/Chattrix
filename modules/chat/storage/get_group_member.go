package storage

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MongoChatStore) GetGroupMembers(ctx context.Context, groupID primitive.ObjectID) ([]primitive.ObjectID, error) {

	var members []struct {
		UserID string `bson:"user_id"`
	}

	filter := bson.M{
		"group_id":   groupID.Hex(),
		"is_deleted": bson.M{"$ne": true},
		"role_id":    bson.M{"$ne": ""},
	}

	cursor, err := s.db.Collection("group_user_roles").Find(ctx, filter)
	if err != nil {
		return nil, err
	}

	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &members); err != nil {
		return nil, err
	}

	userIDs := make([]primitive.ObjectID, 0, len(members))
	for _, m := range members {
		oid, err := primitive.ObjectIDFromHex(m.UserID)
		if err == nil {
			userIDs = append(userIDs, oid)
		}
	}

	return userIDs, nil
}
