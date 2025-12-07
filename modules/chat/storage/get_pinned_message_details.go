package storage

import (
	"context"
	"fmt"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func (s *MongoChatStore) GetPinnedMessageDetails(
	ctx context.Context,
	conversationID primitive.ObjectID,
) ([]models.PinnedMessageDetail, error) {
	fmt.Println("conversationID", conversationID)
	pipeline := mongo.Pipeline{
		{{"$match", bson.M{
			"conversation_id": conversationID,
		}}},

		// Join with messages
		{{"$lookup", bson.M{
			"from":         "messages",
			"localField":   "message_id",
			"foreignField": "_id",
			"as":           "msg",
		}}},

		{{"$unwind", bson.M{
			"path":                       "$msg",
			"preserveNullAndEmptyArrays": true,
		}}},

		// Join sender info
		{{"$lookup", bson.M{
			"from":         "users",
			"localField":   "msg.sender_id",
			"foreignField": "_id",
			"as":           "sender",
		}}},

		{{"$unwind", bson.M{
			"path":                       "$sender",
			"preserveNullAndEmptyArrays": true,
		}}},

		// Join user who pinned
		{{"$lookup", bson.M{
			"from":         "users",
			"localField":   "pinned_by",
			"foreignField": "_id",
			"as":           "pinner",
		}}},

		{{"$unwind", bson.M{
			"path":                       "$pinner",
			"preserveNullAndEmptyArrays": false,
		}}},

		// Output formatting
		{{"$project", bson.M{
			"pin_id":          "$_id",
			"message_id":      "$message_id",
			"conversation_id": "$conversation_id",

			// Message data
			"content":       "$msg.content",
			"sender_id":     "$msg.sender_id",
			"sender_name":   bson.M{"$ifNull": bson.A{"$sender.display_name", "Unknown"}},
			"sender_avatar": bson.M{"$ifNull": bson.A{"$sender.avatar", ""}},

			// Pinner
			"pinned_by_id":     "$pinned_by",
			"pinned_by_name":   bson.M{"$ifNull": bson.A{"$pinner.display_name", "Unknown"}},
			"pinned_by_avatar": bson.M{"$ifNull": bson.A{"$pinner.avatar", ""}},

			// Metadata
			"pinned_at": "$pinned_at",
			"note":      "$note",

			"message_type": "$msg.type",
			"created_at":   "$msg.created_at",
		}}},
	}

	cursor, err := s.db.Collection("pinned_messages").Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}

	var results []models.PinnedMessageDetail
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}
