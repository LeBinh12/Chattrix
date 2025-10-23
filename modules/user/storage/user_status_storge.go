package storage

import (
	"context"
	"my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *mongoStore) Upsert(ctx context.Context, status *models.UserStatus) error {
	_, err := s.db.Collection("user_status").UpdateOne(
		ctx,
		bson.M{"user_id": status.UserID},
		bson.M{"$set": status},
		options.Update().SetUpsert(true),
	)
	return err
}

func (s *mongoStore) GetAll(ctx context.Context, currentUserID string) ([]models.UserStatusResponse, error) {
	collection := s.db.Collection("user_status")

	oid, err := primitive.ObjectIDFromHex(currentUserID)
	if err != nil {
		return nil, err
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"user_id": bson.M{"$ne": oid}}}},

		{{Key: "$lookup", Value: bson.M{
			"from":         "users",
			"localField":   "user_id",
			"foreignField": "_id",
			"as":           "user_info",
		}}},

		{{Key: "$unwind", Value: bson.M{"path": "$user_info", "preserveNullAndEmptyArrays": true}}},

		{{Key: "$project", Value: bson.M{
			"user_id":    "$user_id",
			"name":       "$user_info.display_name",
			"avatar":     "$user_info.avatar",
			"status":     "$status",
			"updated_at": "$updated_at",
		}}},

		// Sắp xếp: online trước, sau đó theo updated_at giảm dần
		{{Key: "$sort", Value: bson.D{
			{Key: "status", Value: -1},     // "online" > "offline" nếu status lưu dạng số/string có thể convert
			{Key: "updated_at", Value: -1}, // mới nhất lên trước
		}}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.UserStatusResponse
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	return results, nil
}
