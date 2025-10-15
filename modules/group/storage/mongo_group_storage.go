package storage

import (
	"context"
	"my-app/modules/group/models"
)

func (s *mongoStoreGroup) Create(ctx context.Context, data *models.Group) error {
	_, err := s.db.Collection("group").InsertOne(ctx, data)
	return err
}
