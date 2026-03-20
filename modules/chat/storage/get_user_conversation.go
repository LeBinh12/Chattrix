package storage

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func (s *MongoChatStore) getUserConversations(ctx context.Context, userObjectID primitive.ObjectID, page, limit int, keyword string, filterIDs []primitive.ObjectID) ([]temp, int64, error) {
	if keyword == "" && len(filterIDs) == 0 {
		return s.getUserConversationsOptimized(ctx, userObjectID, page, limit)
	}

	userCollection := s.db.Collection("users")

	filter := bson.M{
		"_id":        bson.M{"$ne": userObjectID},
		"is_deleted": bson.M{"$ne": true},
	}

	if keyword != "" {
		filter["display_name"] = bson.M{"$regex": keyword, "$options": "i"}
	}

	if len(filterIDs) > 0 {
		filter["_id"] = bson.M{"$in": filterIDs}
	}

	matchUsers := bson.D{{"$match", filter}}

	lookupMessages := bson.D{{
		"$lookup", bson.M{
			"from": "messages",
			"let":  bson.M{"partnerId": "$_id", "userId": userObjectID},
			"pipeline": []bson.M{
				{"$match": bson.M{
					"$expr": bson.M{
						"$or": []bson.M{
							{"$and": []bson.M{
								{"$eq": []interface{}{"$sender_id", "$$userId"}},
								{"$eq": []interface{}{"$receiver_id", "$$partnerId"}},
							}},
							{"$and": []bson.M{
								{"$eq": []interface{}{"$sender_id", "$$partnerId"}},
								{"$eq": []interface{}{"$receiver_id", "$$userId"}},
							}},
						},
					},
					"deleted_for":       bson.M{"$ne": userObjectID},
					"parent_message_id": bson.M{"$exists": false},
				}},
				{"$sort": bson.M{"created_at": -1}},
				{"$limit": 1},
			},
			"as": "last_message",
		},
	}}

	unwindMsg := bson.D{{"$unwind", bson.M{"path": "$last_message", "preserveNullAndEmptyArrays": true}}}

	addUnread := bson.D{{
		"$lookup", bson.M{
			"from": "messages",
			"let":  bson.M{"partnerId": "$_id", "userId": userObjectID},
			"pipeline": []bson.M{
				{"$match": bson.M{
					"$expr": bson.M{
						"$and": []bson.M{
							{"$eq": []interface{}{"$sender_id", "$$partnerId"}},
							{"$eq": []interface{}{"$receiver_id", "$$userId"}},
							{"$eq": []interface{}{"$is_read", false}},
							{"$ne": []interface{}{"$type", "system"}},
							{"$or": []bson.M{
								{"$eq": []interface{}{"$parent_message_id", nil}},
								{"$not": []interface{}{bson.M{"$ifNull": []interface{}{"$parent_message_id", false}}}},
							}},
						},
					},
				}},
			},
			"as": "unread_messages",
		},
	}}

	lookupStatus := bson.D{{
		"$lookup", bson.M{
			"from":         "user_status",
			"localField":   "_id",
			"foreignField": "user_id",
			"as":           "status_info",
		},
	}}

	unwindStatus := bson.D{{"$unwind", bson.M{"path": "$status_info", "preserveNullAndEmptyArrays": true}}}

	addStatusFields := bson.D{{
		"$addFields", bson.M{
			"status":     "$status_info.status",
			"updated_at": "$status_info.updated_at",
			"is_deleted": "$is_deleted",
		},
	}}

	addUnreadCount := bson.D{{
		"$addFields", bson.M{
			"unread_count": bson.M{"$size": "$unread_messages"},
		},
	}}

	sortByLastMessage := bson.D{{"$sort", bson.M{"last_message.created_at": -1}}}

	skipLimit := []bson.D{
		{{"$skip", int64((page - 1) * limit)}},
		{{"$limit", int64(limit)}},
	}

	cursor, err := userCollection.Aggregate(ctx, mongo.Pipeline{
		matchUsers,
		lookupMessages,
		unwindMsg,
		addUnread,
		addUnreadCount,
		lookupStatus,
		unwindStatus,
		addStatusFields,
		sortByLastMessage,
		skipLimit[0],
		skipLimit[1],
	})
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var results []temp
	if err := cursor.All(ctx, &results); err != nil {
		return nil, 0, err
	}

	total, _ := userCollection.CountDocuments(ctx, filter)
	return results, total, nil
}

func (s *MongoChatStore) getUserConversationsOptimized(ctx context.Context, userObjectID primitive.ObjectID, page, limit int) ([]temp, int64, error) {
	messagesCollection := s.db.Collection("messages")

	// 1. Match messages related to the user
	matchStage := bson.D{{"$match", bson.M{
		"$or": []bson.M{
			{"sender_id": userObjectID},
			{"receiver_id": userObjectID},
		},
		"deleted_for":       bson.M{"$ne": userObjectID},
		"group_id":          bson.M{"$exists": false}, // Ensure it's 1-on-1 chat
		"parent_message_id": bson.M{"$exists": false},
	}}}

	// 2. Sort by created_at desc
	sortStage := bson.D{{"$sort", bson.M{"created_at": -1}}}

	// 3. Group by partner ID
	groupStage := bson.D{{"$group", bson.M{
		"_id": bson.M{
			"$cond": bson.M{
				"if":   bson.M{"$eq": []interface{}{"$sender_id", userObjectID}},
				"then": "$receiver_id",
				"else": "$sender_id",
			},
		},
		"last_message": bson.M{"$first": "$$ROOT"},
		"unread_count": bson.M{
			"$sum": bson.M{
				"$cond": bson.M{
					"if": bson.M{
						"$and": []interface{}{

							bson.M{"$eq": []interface{}{"$receiver_id", userObjectID}},
							bson.M{"$eq": []interface{}{"$is_read", false}},
							bson.M{"$ne": []interface{}{"$sender_id", userObjectID}},
							bson.M{"$ne": []interface{}{"$type", "system"}},
							bson.M{"$or": []interface{}{
								bson.M{"$eq": []interface{}{"$parent_message_id", nil}},
								bson.M{"$not": []interface{}{bson.M{"$ifNull": []interface{}{"$parent_message_id", false}}}},
							}},
						},
					},
					"then": 1,
					"else": 0,
				},
			},
		},
	}}}

	// 4. Sort by last message time
	sortGroupStage := bson.D{{"$sort", bson.M{"last_message.created_at": -1}}}

	// 5. Pagination
	skipStage := bson.D{{"$skip", int64((page - 1) * limit)}}
	limitStage := bson.D{{"$limit", int64(limit)}}

	// 6. Lookup User Info
	lookupUserStage := bson.D{{
		"$lookup", bson.M{
			"from":         "users",
			"localField":   "_id",
			"foreignField": "_id",
			"as":           "user_info",
		},
	}}

	unwindUserStage := bson.D{{"$unwind", bson.M{"path": "$user_info", "preserveNullAndEmptyArrays": true}}}

	// 7. Lookup Status
	lookupStatusStage := bson.D{{
		"$lookup", bson.M{
			"from":         "user_status",
			"localField":   "_id",
			"foreignField": "user_id",
			"as":           "status_info",
		},
	}}

	unwindStatusStage := bson.D{{"$unwind", bson.M{"path": "$status_info", "preserveNullAndEmptyArrays": true}}}

	// 8. Project final format
	projectStage := bson.D{{"$project", bson.M{
		"_id":          "$_id",
		"display_name": "$user_info.display_name",
		"avatar":       "$user_info.avatar",
		"last_message": "$last_message",
		"unread_count": "$unread_count",
		"status":       "$status_info.status",
		"updated_at":   "$status_info.updated_at",
		"is_deleted":   "$user_info.is_deleted",
	}}}

	// Execute Aggregation
	cursor, err := messagesCollection.Aggregate(ctx, mongo.Pipeline{
		matchStage,
		sortStage,
		groupStage,
		sortGroupStage,
		skipStage,
		limitStage,
		lookupUserStage,
		unwindUserStage,
		lookupStatusStage,
		unwindStatusStage,
		projectStage,
	})
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var results []temp
	if err := cursor.All(ctx, &results); err != nil {
		return nil, 0, err
	}

	// Count total conversations (This is expensive, maybe we can optimize this later or return approximate)
	// For now, let's use a separate aggregation for count
	countPipeline := mongo.Pipeline{
		matchStage,
		bson.D{{"$group", bson.M{
			"_id": bson.M{
				"$cond": bson.M{
					"if":   bson.M{"$eq": []interface{}{"$sender_id", userObjectID}},
					"then": "$receiver_id",
					"else": "$sender_id",
				},
			},
		}}},
		bson.D{{"$count", "total"}},
	}

	countCursor, err := messagesCollection.Aggregate(ctx, countPipeline)
	var total int64 = 0
	if err == nil {
		var countResult []bson.M
		if err := countCursor.All(ctx, &countResult); err == nil && len(countResult) > 0 {
			if t, ok := countResult[0]["total"].(int32); ok {
				total = int64(t)
			} else if t, ok := countResult[0]["total"].(int64); ok {
				total = t
			}
		}
	}

	return results, total, nil
}
