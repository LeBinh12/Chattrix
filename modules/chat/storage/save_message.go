package storage

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/mongo"
)

type mongoStore struct {
	db *mongo.Database
}

func NewMongoStore(db *mongo.Database) *mongoStore {
	return &mongoStore{db: db}
}

func (s *mongoStore) SaveMessage(ctx context.Context, msg *models.Message) error {
	_, err := s.db.Collection("messages").InsertOne(ctx, msg)
	return err
}
