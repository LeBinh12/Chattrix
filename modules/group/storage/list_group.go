package storage

import (
	"context"
	"my-app/modules/group/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
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

func (s *mongoStoreGroup) ListAllGroupsWithStats(
	ctx context.Context,
	page int64,
	pageSize int64,
) ([]models.GroupDetail, int64, error) {

	groupMemberColl := s.db.Collection("group_members")
	groupColl := s.db.Collection("group")
	messageColl := s.db.Collection("messages")

	skip := (page - 1) * pageSize

	// Tổng số group để pagination
	total, err := groupColl.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, 0, err
	}

	// Lấy nhóm với phân trang
	findOptions := options.Find().
		SetLimit(pageSize).
		SetSkip(skip).
		SetSort(bson.M{"created_at": -1})

	groupCursor, err := groupColl.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		return nil, 0, err
	}
	defer groupCursor.Close(ctx)

	var groups []models.Group
	if err := groupCursor.All(ctx, &groups); err != nil {
		return nil, 0, err
	}

	// Chuẩn bị dữ liệu chi tiết
	var result []models.GroupDetail
	for _, g := range groups {
		// Đếm số lượng thành viên
		membersCount, _ := groupMemberColl.CountDocuments(ctx, bson.M{"group_id": g.ID})

		// Đếm số lượng tin nhắn
		messagesCount, _ := messageColl.CountDocuments(ctx, bson.M{"group_id": g.ID})

		result = append(result, models.GroupDetail{
			ID:            g.ID,
			Name:          g.Name,
			Image:         g.Image,
			MembersCount:  membersCount,
			MessagesCount: messagesCount,
		})
	}

	return result, total, nil
}

func (s *mongoStoreGroup) ListGroupMembersWithUserInfo(
	ctx context.Context,
	groupID primitive.ObjectID,
	page int64,
	pageSize int64,
) ([]models.UserInfoInGroup, int64, error) {
	groupMemberColl := s.db.Collection("group_members")
	skip := (page - 1) * pageSize

	// 1. Tổng số thành viên
	total, err := groupMemberColl.CountDocuments(ctx, bson.M{"group_id": groupID})
	if err != nil {
		return nil, 0, err
	}

	// 2. Pipeline aggregation để lấy member + user info
	pipeline := mongo.Pipeline{
		// Lọc theo group_id
		{{"$match", bson.M{"group_id": groupID}}},
		// Sắp xếp theo joined_at
		{{"$sort", bson.M{"joined_at": 1}}},
		// Pagination
		{{"$skip", skip}},
		{{"$limit", pageSize}},
		// Join với collection users
		{{"$lookup", bson.M{
			"from":         "users",
			"localField":   "user_id",
			"foreignField": "_id",
			"as":           "user_info",
		}}},
		// Unwind mảng user_info (thường chỉ có 1 user)
		{{"$unwind", bson.M{
			"path":                       "$user_info",
			"preserveNullAndEmptyArrays": true,
		}}},
		// Project ra các field cần thiết
		{{"$project", bson.M{
			"_id":          1, // id của group_member
			"user_id":      1,
			"joined_at":    1,
			"role":         1,
			"status":       1,
			"display_name": "$user_info.display_name",
			"email":        "$user_info.email",
			"avatar":       "$user_info.avatar",
		}}},
	}

	cursor, err := groupMemberColl.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var members []models.UserInfoInGroup
	if err := cursor.All(ctx, &members); err != nil {
		return nil, 0, err
	}

	return members, total, nil
}
