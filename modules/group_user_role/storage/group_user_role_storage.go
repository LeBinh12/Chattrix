package storage

import (
	"context"
	"my-app/modules/group_user_role/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type mongoStore struct {
	db *mongo.Database
}

func NewMongoStore(db *mongo.Database) *mongoStore {
	return &mongoStore{db: db}
}

func (s *mongoStore) Create(ctx context.Context, data *models.GroupUserRole) error {
	result, err := s.db.Collection("group_user_roles").InsertOne(ctx, data)
	if err != nil {
		return err
	}
	data.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *mongoStore) FindByID(ctx context.Context, id string) (*models.GroupUserRole, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var data models.GroupUserRole
	err = s.db.Collection("group_user_roles").FindOne(ctx, bson.M{"_id": oid}).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (s *mongoStore) UpdateRole(ctx context.Context, groupID, userID string, roleID string) error {
	_, err := s.db.Collection("group_user_roles").UpdateOne(ctx, bson.M{
		"group_id": groupID,
		"user_id":  userID,
	}, bson.M{"$set": bson.M{"role_id": roleID}})
	return err
}

func (s *mongoStore) Upsert(ctx context.Context, data *models.GroupUserRole) error {
	filter := bson.M{
		"group_id": data.GroupID,
		"user_id":  data.UserID,
	}

	update := bson.M{
		"$set": bson.M{
			"role_id":    data.RoleID,
			"is_deleted": false,
			"updated_at": time.Now(),
		},
		"$setOnInsert": bson.M{
			"created_at": time.Now(),
		},
	}

	opts := options.Update().SetUpsert(true)
	_, err := s.db.Collection("group_user_roles").UpdateOne(ctx, filter, update, opts)
	return err
}
