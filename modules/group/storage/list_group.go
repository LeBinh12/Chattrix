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

	groupMemberColl := s.db.Collection("group_user_roles")
	groupColl := s.db.Collection("group")

	// get all GroupIDs where user is an active participant
	cursor, err := groupMemberColl.Find(ctx, bson.M{
		"user_id":    userID.Hex(),
		"is_deleted": bson.M{"$ne": true},
		"role_id":    bson.M{"$ne": ""},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var groupMembers []struct {
		GroupID string `bson:"group_id"`
	}
	if err := cursor.All(ctx, &groupMembers); err != nil {
		return nil, err
	}

	// if no groups are found
	if len(groupMembers) == 0 {
		return []models.Group{}, nil
	}

	// collect GroupIDs (convert string to ObjectID)
	var groupIDs []primitive.ObjectID
	for _, gm := range groupMembers {
		oid, err := primitive.ObjectIDFromHex(gm.GroupID)
		if err == nil {
			groupIDs = append(groupIDs, oid)
		}
	}

	// query group list with pagination
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
	search string,
	minMember int,
	maxMember int,
) ([]models.GroupDetail, int64, error) {

	groupColl := s.db.Collection("group")
	skip := (page - 1) * pageSize

	// Must use Aggregation because member counting is needed for filtering
	pipeline := mongo.Pipeline{
		// 1. Join members count
		bson.D{{Key: "$lookup", Value: bson.M{
			"from": "group_user_roles",
			"let":  bson.M{"gid": bson.M{"$toString": "$_id"}},
			"pipeline": mongo.Pipeline{
				{{"$match", bson.M{"$expr": bson.M{"$and": []bson.M{
					{"$eq": []interface{}{"$group_id", "$$gid"}},
					{"$ne": []interface{}{"$is_deleted", true}},
					{"$ne": []interface{}{"$role_id", ""}},
				}}}}},
			},
			"as": "members",
		}}},
		bson.D{{Key: "$addFields", Value: bson.M{
			"members_count": bson.M{"$size": "$members"},
		}}},

		// 2. Join messages count
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "messages",
			"localField":   "_id",
			"foreignField": "group_id",
			"as":           "messages",
		}}},
		bson.D{{Key: "$addFields", Value: bson.M{
			"messages_count": bson.M{"$size": "$messages"},
		}}},
	}

	// 3. Match conditions
	match := bson.M{}
	if search != "" {
		match["name"] = bson.M{"$regex": search, "$options": "i"}
	}

	memberFilter := bson.M{}
	if minMember > 0 {
		memberFilter["$gte"] = minMember
	}
	if maxMember > 0 {
		memberFilter["$lte"] = maxMember
	}
	if len(memberFilter) > 0 {
		match["members_count"] = memberFilter
	}

	pipeline = append(pipeline, bson.D{{Key: "$match", Value: match}})

	// 4. Count total
	countPipeline := append(pipeline, bson.D{{Key: "$count", Value: "total"}})
	countCursor, err := groupColl.Aggregate(ctx, countPipeline)

	var total int64 = 0
	if err == nil && countCursor.Next(ctx) {
		var countRes struct {
			Total int64 `bson:"total"`
		}
		if err := countCursor.Decode(&countRes); err == nil {
			total = countRes.Total
		}
		countCursor.Close(ctx)
	}

	// 5. Pagination & Sort
	pipeline = append(pipeline, bson.D{{Key: "$sort", Value: bson.M{"created_at": -1}}})
	pipeline = append(pipeline, bson.D{{Key: "$skip", Value: skip}})
	pipeline = append(pipeline, bson.D{{Key: "$limit", Value: pageSize}})

	// 6. Project result
	pipeline = append(pipeline, bson.D{{Key: "$project", Value: bson.M{
		"_id":            1,
		"name":           1,
		"image":          1,
		"members_count":  1,
		"messages_count": 1,
	}}})

	cursor, err := groupColl.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	result := []models.GroupDetail{}
	if err := cursor.All(ctx, &result); err != nil {
		return nil, 0, err
	}

	return result, total, nil
}

func (s *mongoStoreGroup) ListGroupMembersWithUserInfo(
	ctx context.Context,
	groupID primitive.ObjectID,
	page int64,
	pageSize int64,
) ([]models.UserInfoInGroup, int64, error) {
	groupMemberColl := s.db.Collection("group_user_roles")
	skip := (page - 1) * pageSize

	filter := bson.M{
		"group_id":   groupID.Hex(),
		"is_deleted": bson.M{"$ne": true},
		"role_id":    bson.M{"$ne": ""},
	}

	// 1. Get total number of active members
	total, err := groupMemberColl.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	// 2. Aggregation pipeline to get members with user info
	pipeline := mongo.Pipeline{
		// Filter by group_id and active status
		{{"$match", filter}},
		// Pagination
		{{"$skip", skip}},
		{{"$limit", pageSize}},
		// Join with users collection (convert string user_id to ObjectID)
		{{"$lookup", bson.M{
			"from": "users",
			"let":  bson.M{"uid": "$user_id"},
			"pipeline": mongo.Pipeline{
				{{"$match", bson.M{"$expr": bson.M{"$eq": []interface{}{"$_id", bson.M{"$toObjectId": "$$uid"}}}}}},
			},
			"as": "user_info",
		}}},
		// Unwind user_info array
		{{"$unwind", bson.M{
			"path":                       "$user_info",
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
		// Project necessary fields
		{{"$project", bson.M{
			"_id":       1, // group_member id
			"user_id":   bson.M{"$toObjectId": "$user_id"},
			"group_id":  bson.M{"$toObjectId": "$group_id"},
			"joined_at": 1,
			// Role code from the roles table takes precedence over the string in group_members
			"role": bson.M{
				"$ifNull": []interface{}{"$role_info_array.code", "$role"},
			},
			"role_info": bson.M{
				"code":        "$role_info_array.code",
				"name":        "$role_info_array.name",
				"permissions": "$role_info_array.permissions",
			},
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
