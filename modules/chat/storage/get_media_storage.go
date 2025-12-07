package storage

import (
	"context"
	"fmt"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MongoChatStore) GetMediaList(
	ctx context.Context,
	currentUserID, receiverID, groupID primitive.ObjectID,
	mediaType models.MediaType,
	page, limit int,
) (*models.MediaPagination, error) {

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// === Filter message
	messageFilter := bson.M{
		"type":        bson.M{"$in": []models.MediaType{"image", "video", "file"}},
		"media_ids.0": bson.M{"$exists": true},
	}

	if !groupID.IsZero() {
		messageFilter["group_id"] = groupID
	} else if !receiverID.IsZero() {
		messageFilter["$or"] = []bson.M{
			{"sender_id": currentUserID, "receiver_id": receiverID},
			{"sender_id": receiverID, "receiver_id": currentUserID},
		}
	} else {
		return nil, fmt.Errorf("must provide either group_id or receiver_id")
	}

	// === Base pipeline
	pipeline := []bson.M{
		{"$match": messageFilter},
		{"$sort": bson.M{"created_at": -1}},
		{"$skip": int64((page - 1) * limit)},
		{"$limit": int64(limit)},
		{
			"$lookup": bson.M{
				"from":         "medias",
				"localField":   "media_ids",
				"foreignField": "_id",
				"as":           "media_items",
			},
		},
		{"$unwind": "$media_items"},
	}

	// Match theo media type
	if mediaType != "" {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{"media_items.type": mediaType},
		})
	} else {
		fmt.Println(">>> NO mediaType filter applied")
	}

	// Project
	pipeline = append(pipeline, bson.M{
		"$project": bson.M{
			"message_id": "$_id",
			"sender_id":  "$sender_id",
			"created_at": bson.M{"$toLong": "$created_at"},
			"content":    "$content",
			"is_read":    "$is_read",

			"media_id": "$media_items._id",
			"type":     "$media_items.type",
			"filename": "$media_items.filename",
			"size":     "$media_items.size",
			"url":      "$media_items.url",
		},
	})

	cursor, err := s.db.Collection("messages").Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.MediaItemResponse

	for cursor.Next(ctx) {
		var item struct {
			MessageID primitive.ObjectID `bson:"message_id"`
			SenderID  primitive.ObjectID `bson:"sender_id"`
			CreatedAt int64              `bson:"created_at"`
			Content   string             `bson:"content"`
			IsRead    bool               `bson:"is_read"`

			MediaID  primitive.ObjectID `bson:"media_id"`
			Type     models.MediaType   `bson:"type"`
			Filename string             `bson:"filename"`
			Size     int64              `bson:"size"`
			URL      string             `bson:"url"`
		}

		if err := cursor.Decode(&item); err != nil {
			continue
		}

		// In ra mỗi media
		fmt.Printf("✔ Decoded media: %+v\n", item)

		results = append(results, models.MediaItemResponse{
			ID:        item.MediaID,
			MessageID: item.MessageID,
			SenderID:  item.SenderID,
			CreatedAt: item.CreatedAt,
			Type:      item.Type,
			Filename:  item.Filename,
			Size:      item.Size,
			URL:       item.URL,
			Content:   item.Content,
			IsRead:    item.IsRead,
		})
	}

	// === Count pipeline
	countPipeline := []bson.M{
		{"$match": messageFilter},
		{
			"$lookup": bson.M{
				"from":         "media",
				"localField":   "media_ids",
				"foreignField": "_id",
				"as":           "media_items",
			},
		},
		{"$unwind": "$media_items"},
	}

	if mediaType != "" {
		countPipeline = append(countPipeline, bson.M{
			"$match": bson.M{"media_items.type": mediaType},
		})
	}

	countPipeline = append(countPipeline, bson.M{
		"$count": "total",
	})

	countCursor, err := s.db.Collection("messages").Aggregate(ctx, countPipeline)
	if err != nil {
		fmt.Println("❌ Count aggregate ERROR:", err)
		return nil, err
	}
	defer countCursor.Close(ctx)

	total := int64(0)
	if countCursor.Next(ctx) {
		var count struct {
			Total int64 `bson:"total"`
		}
		countCursor.Decode(&count)
		total = count.Total
	}

	return &models.MediaPagination{
		Total: total,
		Page:  page,
		Limit: limit,
		Items: results,
	}, nil
}
