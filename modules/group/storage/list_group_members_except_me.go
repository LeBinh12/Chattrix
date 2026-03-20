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

	groupMemberColl := s.db.Collection("group_user_roles")

	skip := (page - 1) * limit

	filter := bson.M{
		"group_id":   groupID.Hex(),
		"is_deleted": bson.M{"$ne": true},
		"role_id":    bson.M{"$ne": ""},
	}

	// 1. Calculate total active members
	total, err := groupMemberColl.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	matchStage := filter
	if keyword != "" {
		matchStage["$or"] = []bson.M{
			{"user.display_name": bson.M{"$regex": keyword, "$options": "i"}},
			{"user.username": bson.M{"$regex": keyword, "$options": "i"}},
		}
	}

	pipeline := mongo.Pipeline{

		// 2. Join users (convert string user_id to ObjectID)
		{{"$lookup", bson.M{
			"from": "users",
			"let":  bson.M{"uid": "$user_id"},
			"pipeline": mongo.Pipeline{
				{{"$match", bson.M{"$expr": bson.M{"$and": []bson.M{
					{"$eq": []interface{}{"$_id", bson.M{"$toObjectId": "$$uid"}}},
				}}}}},
			},
			"as": "user",
		}}},

		{{"$unwind", bson.M{
			"path":                       "$user",
			"preserveNullAndEmptyArrays": false,
		}}},

		// Match after joining user to filter by keyword
		{{"$match", matchStage}},

		// Join user_status (online/offline)
		{{"$lookup", bson.M{
			"from":         "user_status",
			"localField":   "user._id",
			"foreignField": "user_id",
			"as":           "status_info",
		}}},

		{{"$unwind", bson.M{
			"path":                       "$status_info",
			"preserveNullAndEmptyArrays": true,
		}}},

		// Join with roles collection using role_id (convert from string to ObjectID)
		{{"$lookup", bson.M{
			"from": "roles",
			"let":  bson.M{"rid": "$role_id"},
			"pipeline": mongo.Pipeline{
				{{"$match", bson.M{"$expr": bson.M{"$eq": []interface{}{"$_id", bson.M{"$toObjectId": "$$rid"}}}}}},
				// Join with role_permissions
				{{"$lookup", bson.M{
					"from":         "role_permissions",
					"localField":   "_id",
					"foreignField": "role_id",
					"as":           "rp",
				}}},
				// Join with permissions to retrieve codes
				{{"$lookup", bson.M{
					"from":         "permissions",
					"localField":   "rp.permission_id",
					"foreignField": "_id",
					"as":           "perms",
				}}},
				// Add permissions field containing an array of codes
				{{"$addFields", bson.M{
					"permissions": "$perms.code",
				}}},
			},
			"as": "role_info_array",
		}}},
		{{"$unwind", bson.M{
			"path":                       "$role_info_array",
			"preserveNullAndEmptyArrays": true,
		}}},

		// 5. Project required return data
		{{"$project", bson.M{
			"_id":      1,
			"group_id": bson.M{"$toObjectId": "$group_id"},
			"user_id":  bson.M{"$toObjectId": "$user_id"},
			// Role code from the roles table takes precedence over the string in group_members
			"role": bson.M{
				"$ifNull": []interface{}{"$role_info_array.code", "$role"},
			},
			"status":    1,
			"joined_at": 1,

			"username":     "$user.username",
			"display_name": "$user.display_name",
			"email":        "$user.email",
			"avatar":       "$user.avatar",
			"phone":        "$user.phone",

			"role_info": bson.M{
				"code":        "$role_info_array.code",
				"name":        "$role_info_array.name",
				"permissions": "$role_info_array.permissions",
			},

			"online_status": bson.M{
				"$ifNull": []interface{}{"$status_info.status", "offline"},
			},
			"last_online_at": "$status_info.updated_at",
		}}},
		// Apply pagination
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
