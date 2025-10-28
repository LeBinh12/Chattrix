package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserStatus struct {
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Status    string             `bson:"status" json:"status"` // online || offline
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

type UserStatusResponse struct {
	UserID    string    `bson:"user_id" json:"user_id"`
	Name      string    `bson:"name" json:"name"`
	Avatar    string    `bson:"avatar" json:"avatar"`
	Status    string    `bson:"status" json:"status"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}
