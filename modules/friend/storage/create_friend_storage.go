package storage

import (
	"context"
	"my-app/modules/friend/models"

	"go.mongodb.org/mongo-driver/mongo"
)

type mongoCreateFriend struct {
	db *mongo.Database
}

func NewMongoStoreCreateFriend(db *mongo.Database) *mongoCreateFriend {
	return &mongoCreateFriend{db: db}
}

func (s *mongoStoreFriend) Create(ctx context.Context, data *models.FriendShip) error {
	_, err := s.db.Collection("friend_ship").InsertOne(ctx, data)
	return err
}
