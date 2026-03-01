package storage

import (
	"context"
	"my-app/modules/user/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *mongoStore) Update(ctx context.Context, id primitive.ObjectID, data *models.UpdateRequest) error {
	updateFields := bson.M{
		"phone":               data.Phone,
		"display_name":        data.DisplayName,
		"birthday":            data.Birthday,
		"gender":              data.Gender,
		"is_profile_complete": true,
		"updated_at":          time.Now(),
	}

	if data.Avatar != "" {
		updateFields["avatar"] = data.Avatar
	}

	update := bson.M{
		"$set": updateFields,
	}

	_, err := s.db.Collection("users").UpdateByID(ctx, id, update, &options.UpdateOptions{})
	return err
}

func (s *mongoStore) UpdatePassword(ctx context.Context, id primitive.ObjectID, hashedPassword string) error {
	update := bson.M{
		"$set": bson.M{
			"password": hashedPassword,
		},
	}

	_, err := s.db.Collection("users").UpdateByID(ctx, id, update, &options.UpdateOptions{})
	return err
}

func (s *mongoStore) AdminUpdate(ctx context.Context, id primitive.ObjectID, data *models.AdminUpdateUserRequest) error {
	updateFields := bson.M{}

	if data.Username != "" {
		updateFields["username"] = data.Username
	}
	if data.Email != "" {
		updateFields["email"] = data.Email
	}
	if data.Avatar != "" {
		updateFields["avatar"] = data.Avatar
	}
	if data.Phone != "" {
		updateFields["phone"] = data.Phone
	}
	if data.DisplayName != "" {
		updateFields["display_name"] = data.DisplayName
	}
	if !data.Birthday.IsZero() {
		updateFields["birthday"] = data.Birthday
	}
	if data.Gender != "" {
		updateFields["gender"] = data.Gender
	}
	if data.Type != "" {
		updateFields["type"] = data.Type
	}
	if data.Description != "" {
		updateFields["description"] = data.Description
	}

	updateFields["updated_at"] = time.Now()

	update := bson.M{"$set": updateFields}
	_, err := s.db.Collection("users").UpdateByID(ctx, id, update, &options.UpdateOptions{})
	if err != nil {
		return err
	}

	// Update roles nếu có truyền vào
	if len(data.Roles) > 0 {
		// Xóa tất cả role cũ của user
		_, err := s.db.Collection("user_roles").DeleteMany(ctx, bson.M{
			"user_id": id,
		})
		if err != nil {
			return err
		}

		// Thêm các role mới
		for _, roleID := range data.Roles {
			roleOID, err := primitive.ObjectIDFromHex(roleID)
			if err != nil {
				continue // Bỏ qua roleID không hợp lệ
			}

			userRole := bson.M{
				"user_id":    id,
				"role_id":    roleOID,
				"created_at": time.Now(),
				"updated_at": time.Now(),
				"is_deleted": false,
			}

			_, err = s.db.Collection("user_roles").InsertOne(ctx, userRole)
			if err != nil {
				// Log error nhưng không fail toàn bộ operation
				continue
			}
		}
	}

	return nil
}
