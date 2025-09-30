package storage

import (
	"context"
	"errors"
	"fmt"
	"my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type FriendStatus string

var (
	StatusNotFriend FriendStatus = "not_friend"
	StatusPending   FriendStatus = "pending"
	StatusAccepted  FriendStatus = "accepted"
	StatusBlock     FriendStatus = "block"
)

type mongoStoreFriend struct {
	db *mongo.Database
}

func NewMongoStoreFriend(db *mongo.Database) *mongoStoreFriend {
	return &mongoStoreFriend{db: db}
}

func (s *mongoStoreFriend) Create(ctx context.Context, data *models.FriendShip) error {
	_, err := s.db.Collection("friend_ship").InsertOne(ctx, data)
	return err
}

func (s *mongoStoreFriend) CheckUserExists(ctx context.Context, userID string) (bool, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return false, err
	}
	filter := bson.M{"_id": oid} // nếu user._id bạn lưu là string
	err = s.db.Collection("users").FindOne(ctx, filter).Err()

	if err == mongo.ErrNoDocuments {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *mongoStoreFriend) CheckFriend(ctx context.Context, userID, friendID string) (models.FriendShip, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"user_id": userID, "friend_id": friendID},
			{"user_id": friendID, "friend_id": userID},
		},
	}

	var friendShip models.FriendShip
	err := s.db.Collection("friend_ship").FindOne(ctx, filter).Decode(&friendShip)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return models.FriendShip{}, errors.New("Friendship not found")
		}
		return models.FriendShip{}, err
	}

	return friendShip, nil
}

func (s *mongoStoreFriend) UpdateStatus(ctx context.Context, Id primitive.ObjectID, NewStatus FriendStatus) error {
	friend := bson.M{"_id": Id}
	update := bson.M{"$set": bson.M{"status": NewStatus}}

	result, err := s.db.Collection("friend_ship").UpdateOne(ctx, friend, update)

	if err != nil {
		return fmt.Errorf("failed to update friend status: %v", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("no user found with id %v", Id.Hex())
	}

	return nil
}

func (s *mongoStoreFriend) UnBlock(ctx context.Context, ID primitive.ObjectID) error {
	return s.UpdateStatus(ctx, ID, StatusPending)
}
