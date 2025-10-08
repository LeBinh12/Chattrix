package storage

import (
	"context"
	"fmt"
	"time"

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

type MongoStoreUpdateFriend struct {
	db *mongo.Database
}

func NewMongoStoreUpdateFriend(db *mongo.Database) *MongoStoreUpdateFriend {
	return &MongoStoreUpdateFriend{db: db}
}

func (s *mongoStoreFriend) UpdateStatusWithAction(ctx context.Context, id primitive.ObjectID, newStatus FriendStatus, lastActionBy string) error {
	filter := bson.M{"_id": id}
	// các dữ liệu cần cập nhật
	update := bson.M{
		"$set": bson.M{
			"status":         newStatus,
			"last_action_by": lastActionBy,
			"updated_at":     time.Now(),
		},
	}

	result, err := s.db.Collection("friend_ship").UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update friend status: %v", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("no friend record found with id %v", id.Hex())
	}

	return nil
}

func (s *mongoStoreFriend) UpdateFriendStatusByUsers(ctx context.Context, userA, userB string, newStatus FriendStatus) error {
	filter := bson.M{
		"$or": []bson.M{
			{"user_id": userA, "friend_id": userB},
			{"user_id": userB, "friend_id": userA},
		},
	}

	update := bson.M{
		"$set": bson.M{
			"status":     newStatus,
			"updated_at": time.Now(),
		},
	}

	result, err := s.db.Collection("friend_ship").UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update friend status: %v", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("no friendship found between users %s and %s", userA, userB)
	}

	return nil
}
