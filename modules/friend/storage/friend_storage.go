package storage

import (
	"context"
	"errors"
	"my-app/modules/friend/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type mongoStoreFriend struct {
	db *mongo.Database
}

func NewMongoStoreFriend(db *mongo.Database) *mongoStoreFriend {
	return &mongoStoreFriend{db: db}
}

func (s *mongoStoreFriend) CheckUserExists(ctx context.Context, userID string) (bool, error) {
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

func (s *mongoStoreFriend) GetRelation(ctx context.Context, userA, userB string) (string, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"user_id": userA, "friend_id": userB},
			{"user_id": userB, "friend_id": userA},
		},
	}

	var f models.FriendShip
	err := s.db.Collection("friend_ship").FindOne(ctx, filter).Decode(&f)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return string(StatusNotFriend), nil
		}
		return "", err
	}

	// Phân biệt chiều gửi lời mời
	if f.Status == string(StatusPending) {
		if f.UserID == userA {
			return "pending_sent", nil
		}
		return "pending_received", nil
	}

	return f.Status, nil
}
