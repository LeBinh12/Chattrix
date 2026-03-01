package storage

import (
	"context"
	"my-app/modules/group_member/models"

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

func (s *mongoStore) Create(ctx context.Context, data *models.GroupMember) error {
	result, err := s.db.Collection("group_user_roles").InsertOne(ctx, data)
	if err != nil {
		return err
	}
	data.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *mongoStore) FindByID(ctx context.Context, id string) (*models.GroupMember, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var data models.GroupMember
	err = s.db.Collection("group_user_roles").FindOne(ctx, bson.M{"_id": oid}).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}
