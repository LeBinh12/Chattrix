package storage

import (
	"context"
	"my-app/modules/group/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *mongoStoreGroup) Create(ctx context.Context, data *models.Group) error {
	data.ID = primitive.NewObjectID()
	data.CreatedAt = time.Now()
	data.UpdatedAt = time.Now()

	_, err := s.db.Collection("group").InsertOne(ctx, data)
	return err
}
