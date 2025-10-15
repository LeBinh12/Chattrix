package storage

import (
	"context"
	"my-app/modules/user/models"
)

func (s *mongoStore) Create(ctx context.Context, data *models.User) error {
	_, err := s.db.Collection("users").InsertOne(ctx, data)
	return err
}
