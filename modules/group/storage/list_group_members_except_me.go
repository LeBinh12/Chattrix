package storage

import (
	"context"
	"my-app/modules/group/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func (s *mongoStoreGroup) ListGroupMembersExceptMe(
	ctx context.Context,
	groupID primitive.ObjectID,
	userID primitive.ObjectID,
	page int,
	limit int,
	keyword string,
) ([]models.GroupMemberDetail, int64, error) {

	groupMemberColl := s.db.Collection("group_members")

	skip := (page - 1) * limit

	total, err := groupMemberColl.CountDocuments(ctx, bson.M{
		"group_id": groupID,
		"user_id":  bson.M{"$ne": userID},
	})
	if err != nil {
		return nil, 0, err
	}

	matchStage := bson.M{
		"group_id": groupID,
		"user_id":  bson.M{"$ne": userID},
	}
	if keyword != "" {
		matchStage["$or"] = []bson.M{
			{"user.display_name": bson.M{"$regex": keyword, "$options": "i"}},
			{"user.username": bson.M{"$regex": keyword, "$options": "i"}},
		}
	}

	pipeline := mongo.Pipeline{

		// 2. Join users
		{{"$lookup", bson.M{
			"from":         "users",
			"localField":   "user_id",
			"foreignField": "_id",
			"as":           "user",
		}}},

		{{"$unwind", bson.M{
			"path":                       "$user",
			"preserveNullAndEmptyArrays": false,
		}}},

		// Match sau khi join user để filter theo keyword
		{{"$match", matchStage}},

		// 3. Join user_status (online/offline)
		{{"$lookup", bson.M{
			"from":         "user_status",
			"localField":   "user_id",
			"foreignField": "user_id",
			"as":           "status_info",
		}}},

		{{"$unwind", bson.M{
			"path":                       "$status_info",
			"preserveNullAndEmptyArrays": true,
		}}},

		// 4. Project dữ liệu cần trả về
		{{"$project", bson.M{
			"_id":       1,
			"group_id":  1,
			"user_id":   1,
			"role":      1,
			"status":    1,
			"joined_at": 1,

			"username":     "$user.username",
			"display_name": "$user.display_name",
			"email":        "$user.email",
			"avatar":       "$user.avatar",
			"phone":        "$user.phone",

			"online_status": bson.M{
				"$ifNull": []interface{}{"$status_info.status", "offline"},
			},
			"last_online_at": "$status_info.updated_at",
		}}},
		// 1. mathch các điều kiện trên
		{{"$skip", skip}},
		{{"$limit", limit}},
	}

	cursor, err := groupMemberColl.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var members []models.GroupMemberDetail
	if err := cursor.All(ctx, &members); err != nil {
		return nil, 0, err
	}

	return members, total, nil
}
