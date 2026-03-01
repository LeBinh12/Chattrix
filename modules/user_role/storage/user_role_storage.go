package storage

import (
	"context"
	"my-app/modules/user_role/models"

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

func (s *mongoStore) Create(ctx context.Context, data *models.UserRole) error {
	result, err := s.db.Collection("user_roles").InsertOne(ctx, data)
	if err != nil {
		return err
	}
	data.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *mongoStore) FindByID(ctx context.Context, id string) (*models.UserRole, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var data models.UserRole
	err = s.db.Collection("user_roles").FindOne(ctx, bson.M{"_id": oid}).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (s *mongoStore) FindByUserID(ctx context.Context, userID string) ([]models.UserRole, error) {
	var results []models.UserRole
	cursor, err := s.db.Collection("user_roles").Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	if err = cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	return results, nil
}
