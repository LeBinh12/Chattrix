package storage

import (
	"context"
	"my-app/modules/group/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *mongoStoreGroup) ListGroupsByUser(
	ctx context.Context,
	userID primitive.ObjectID,
	limit int64,
	skip int64,
) ([]models.Group, error) {

	groupMemberColl := s.db.Collection("group_members")
	groupColl := s.db.Collection("group")

	// lấy tất cả GroupID mà user tham gia
	cursor, err := groupMemberColl.Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var groupMembers []models.GroupMember
	if err := cursor.All(ctx, &groupMembers); err != nil {
		return nil, err
	}

	// nếu không có nhóm nào
	if len(groupMembers) == 0 {
		return []models.Group{}, nil
	}

	// gom GroupID lại
	var groupIDs []primitive.ObjectID
	for _, gm := range groupMembers {
		groupIDs = append(groupIDs, gm.GroupID)
	}

	// query danh sách nhóm có phân trang
	findOptions := options.Find().
		SetLimit(limit).
		SetSkip(skip).
		SetSort(bson.M{"created_at": -1})

	groupCursor, err := groupColl.Find(ctx, bson.M{
		"_id": bson.M{"$in": groupIDs},
	}, findOptions)
	if err != nil {
		return nil, err
	}
	defer groupCursor.Close(ctx)

	var groups []models.Group
	if err := groupCursor.All(ctx, &groups); err != nil {
		return nil, err
	}

	return groups, nil
}
