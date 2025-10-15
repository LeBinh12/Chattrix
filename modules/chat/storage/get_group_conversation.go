package storage

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func (s *MongoChatStore) getGroupConversations(ctx context.Context, userObjectID primitive.ObjectID, page, limit int, keyword string) ([]groupTemp, error) {
	groupMemberCollection := s.db.Collection("group_members")

	matchGroups := bson.D{{"$match", bson.M{"user_id": userObjectID}}}

	lookupGroup := bson.D{{
		"$lookup", bson.M{
			"from":         "group",
			"localField":   "group_id",
			"foreignField": "_id",
			"as":           "group_info",
		}}}

	unwindGroup := bson.D{{"$unwind", "$group_info"}}

	matchKeyword := bson.D{}

	if keyword != "" {
		matchKeyword = bson.D{{"$match", bson.M{
			"group_info.name": bson.M{"$regex": keyword, "$options": "i"},
		}}}
	}

	// Lookup tin nhắn mới nhất trong group
	lookupLastMessage := bson.D{{
		"$lookup", bson.M{
			"from": "messages",
			"let":  bson.M{"groupId": "$group_id"},
			"pipeline": []bson.M{
				{"$match": bson.M{"$expr": bson.M{"$eq": []interface{}{"$group_id", "$$groupId"}}}},
				{"$sort": bson.M{"created_at": -1}},
				{"$limit": 1},
			},
			"as": "last_message",
		},
	}}

	unwindMessage := bson.D{{"$unwind", bson.M{"path": "$last_message", "preserveNullAndEmptyArrays": true}}}

	pipeline := mongo.Pipeline{matchGroups, lookupGroup, unwindGroup}
	if keyword != "" {
		pipeline = append(pipeline, matchKeyword)
	}
	pipeline = append(pipeline, lookupLastMessage, unwindMessage,
		bson.D{{"$skip", int64((page - 1) * limit)}},
		bson.D{{"$limit", int64(limit)}},
	)

	cursor, err := groupMemberCollection.Aggregate(ctx, pipeline)

	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var groups []groupTemp
	if err := cursor.All(ctx, &groups); err != nil {
		return nil, err
	}

	return groups, nil
}
