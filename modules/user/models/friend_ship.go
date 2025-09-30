package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FriendShip struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserID    string             `bson:"user_id" json:"user_id"`
	FriendID  string             `bson:"friend_id" json:"friend_id"`
	Status    string             `bson:"status" json:"status"` // pending, accepted, rejected, blocked
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

type UserFriend struct {
	UserID   string `json:"user_id" binding:"required"`
	FriendID string `json:"friend_id" binding:"required"`
}
