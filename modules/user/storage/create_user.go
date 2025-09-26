package storage

import (
	"context"
	"my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/mongo"
)

type mongoStore struct {
	db *mongo.Database
}

func NewMongoStore(db *mongo.Database) *mongoStore {
	return &mongoStore{db: db}

}
func (s *mongoStore) Create(ctx context.Context, data *models.User) error {
	_, err := s.db.Collection("users").InsertOne(ctx, data)
	return err
}

func (s *mongoStore) FindByUsername(ctx context.Context, username string) (*models.User, error) {
	var user models.User
	err := s.db.Collection("users").FindOne(ctx, map[string]interface{}{"username": username}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}
