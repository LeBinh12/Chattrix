package storage

import (
	"context"
	userModel "my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *mongoStoreGroup) ListUsersNotInGroup(
	ctx context.Context,
	groupID primitive.ObjectID,
	limit int64,
	skip int64,
) ([]userModel.User, error) {

	groupUserRoleColl := s.db.Collection("group_user_roles")
	userColl := s.db.Collection("users")

	// Get active UserIDs in the group (from group_user_roles)
	cursor, err := groupUserRoleColl.Find(ctx, bson.M{
		"group_id":   groupID.Hex(),
		"is_deleted": bson.M{"$ne": true},
		"role_id":    bson.M{"$ne": ""},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var gurList []struct {
		UserID string `bson:"user_id"`
	}
	if err := cursor.All(ctx, &gurList); err != nil {
		return nil, err
	}

	// collect UserIDs that are already in the group
	existUserIDs := make([]primitive.ObjectID, 0)
	for _, m := range gurList {
		oid, err := primitive.ObjectIDFromHex(m.UserID)
		if err == nil {
			existUserIDs = append(existUserIDs, oid)
		}
	}

	// Filter condition: Users not in the existUserIDs list
	filter := bson.M{
		"is_deleted": bson.M{"$ne": true},
	}
	if len(existUserIDs) > 0 {
		filter["_id"] = bson.M{"$nin": existUserIDs}
	}

	findOptions := options.Find().
		SetLimit(limit).
		SetSkip(skip).
		SetSort(bson.M{"created_at": -1})

	userCursor, err := userColl.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, err
	}
	defer userCursor.Close(ctx)

	var users []userModel.User
	if err := userCursor.All(ctx, &users); err != nil {
		return nil, err
	}

	return users, nil
}
