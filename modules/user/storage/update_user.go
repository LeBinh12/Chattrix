package storage

import (
	"context"
	"my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *mongoStore) Update(ctx context.Context, id primitive.ObjectID, data *models.UpdateRequest) error {
	update := bson.M{
		"$set": bson.M{
			"avatar":              data.Avatar,
			"phone":               data.Phone,
			"display_name":        data.DisplayName,
			"birthday":            data.Birthday,
			"gender":              data.Gender,
			"is_profile_complete": true,
		},
	}

	_, err := s.db.Collection("users").UpdateByID(ctx, id, update, &options.UpdateOptions{})
	return err
}
