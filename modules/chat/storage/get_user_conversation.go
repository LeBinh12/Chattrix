package storage

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func (s *MongoChatStore) getUserConversations(ctx context.Context, userObjectID primitive.ObjectID, page, limit int, keyword string) ([]temp, int64, error) {
	userCollection := s.db.Collection("users")

	filter := bson.M{"_id": bson.M{"$ne": userObjectID}}
	if keyword != "" {
		filter["display_name"] = bson.M{"$regex": keyword, "$options": "i"}
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
