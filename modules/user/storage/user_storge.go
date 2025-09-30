package storage

import (
	"context"
	"my-app/modules/user/models"

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

func (s *mongoStore) FindByEmail(ctx context.Context, username string) (*models.User, error) {
	var user models.User
	err := s.db.Collection("users").FindOne(ctx, map[string]interface{}{"email": username}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *mongoStore) FindByID(ctx context.Context, id string) (*models.User, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var user models.User
	err = s.db.Collection("users").FindOne(ctx, bson.M{"_id": oid}).Decode(&user)
	if err != nil {
		return nil, err
	}

	// Không trả về password
	user.Password = ""
	return &user, nil
}
