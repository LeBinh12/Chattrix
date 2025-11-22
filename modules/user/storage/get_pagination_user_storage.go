package storage

import (
	"context"
	"my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func (s *mongoStore) GetPaginatedUsersWithStatus(ctx context.Context, page, limit int64) ([]models.UserWithStatus, int64, error) {
	collection := s.db.Collection("users")

	pipeline := mongo.Pipeline{
		// 1. Join với user_status
		{{Key: "$lookup", Value: bson.M{
			"from":         "user_status",
			"localField":   "_id",
			"foreignField": "user_id",
			"as":           "status_info",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$status_info", "preserveNullAndEmptyArrays": true}}},

		// 2. Join với messages để đếm số tin nhắn
		{{Key: "$lookup", Value: bson.M{
			"from":         "messages",
			"localField":   "_id",
			"foreignField": "sender_id",
			"as":           "messages_info",
		}}},

		// 3. Project - GIỮ NGUYÊN STRUCTURE, không nest vào "user"
		{{Key: "$project", Value: bson.M{
			"_id":                       1, // Giữ nguyên _id
			"created_at":                1,
			"updated_at":                1,
			"username":                  1,
			"password":                  1,
			"email":                     1,
			"avatar":                    1,
			"phone":                     1,
			"display_name":              1,
			"birthday":                  1,
			"gender":                    1,
			"is_completed_friend_setup": 1,
			"is_profile_complete":       1,
			"status": bson.M{
				"$ifNull": []interface{}{"$status_info.status", "offline"},
			},
			"messages_count": bson.M{"$size": "$messages_info"},
		}}},

		// 4. Sort online trước, mới nhất sau
		{{Key: "$sort", Value: bson.D{
			{Key: "status", Value: -1},
			{Key: "updated_at", Value: -1},
		}}},

		// 5. Pagination
		{{Key: "$skip", Value: (page - 1) * limit}},
		{{Key: "$limit", Value: limit}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	// Unmarshal thủ công
	var users []models.UserWithStatus
	for cursor.Next(ctx) {
		var raw bson.M
		if err := cursor.Decode(&raw); err != nil {
			return nil, 0, err
		}

		// Tạo User object
		var user models.User

		// Map các field vào User
		if id, ok := raw["_id"].(primitive.ObjectID); ok {
			user.ID = id
		}
		if createdAt, ok := raw["created_at"].(primitive.DateTime); ok {
			user.CreatedAt = createdAt.Time()
		}
		if updatedAt, ok := raw["updated_at"].(primitive.DateTime); ok {
			user.UpdatedAt = updatedAt.Time()
		}
		if username, ok := raw["username"].(string); ok {
			user.Username = username
		}
		if password, ok := raw["password"].(string); ok {
			user.Password = password
		}
		if email, ok := raw["email"].(string); ok {
			user.Email = email
		}
		if avatar, ok := raw["avatar"].(string); ok {
			user.Avatar = avatar
		}
		if phone, ok := raw["phone"].(string); ok {
			user.Phone = phone
		}
		if displayName, ok := raw["display_name"].(string); ok {
			user.DisplayName = displayName
		}
		if birthday, ok := raw["birthday"].(primitive.DateTime); ok {
			user.Birthday = birthday.Time()
		}
		if gender, ok := raw["gender"].(string); ok {
			user.Gender = gender
		}
		if isCompletedFriendSetup, ok := raw["is_completed_friend_setup"].(bool); ok {
			user.IsCompletedFriendSetup = isCompletedFriendSetup
		}
		if isProfileComplete, ok := raw["is_profile_complete"].(bool); ok {
			user.IsProfileComplete = isProfileComplete
		}

		// Tạo UserWithStatus object
		userWithStatus := models.UserWithStatus{
			User: user,
		}

		if status, ok := raw["status"].(string); ok {
			userWithStatus.Status = status
		} else {
			userWithStatus.Status = "offline"
		}

		if messagesCount, ok := raw["messages_count"].(int32); ok {
			userWithStatus.MessagesCount = int(messagesCount)
		} else if messagesCount, ok := raw["messages_count"].(int64); ok {
			userWithStatus.MessagesCount = int(messagesCount)
		}

		users = append(users, userWithStatus)
	}

	if err := cursor.Err(); err != nil {
		return nil, 0, err
	}

	// Tổng số user
	total, err := collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}
