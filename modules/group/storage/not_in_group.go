package storage

import (
	"context"
	"my-app/modules/group/models"
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

	groupMemberColl := s.db.Collection("group_members")
	userColl := s.db.Collection("users")

	// Lấy danh sách UserID đã nằm trong group
	cursor, err := groupMemberColl.Find(ctx, bson.M{"group_id": groupID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var members []models.GroupMember
	if err := cursor.All(ctx, &members); err != nil {
		return nil, err
	}

	// gom userID
	existUserIDs := make([]primitive.ObjectID, 0)
	for _, m := range members {
		existUserIDs = append(existUserIDs, m.UserID)
	}

	// Điều kiện lọc
	filter := bson.M{}
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
