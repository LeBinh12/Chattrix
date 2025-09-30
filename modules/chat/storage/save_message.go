package storage

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
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

func (s *mongoStore) CheckUserExists(ctx context.Context, userID string) (bool, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return false, err
	}

	filter := bson.M{"_id": oid}
	err = s.db.Collection("users").FindOne(ctx, filter).Err()
	if err == mongo.ErrNoDocuments {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}
