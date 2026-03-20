package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ConversationTag struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID         primitive.ObjectID `bson:"user_id" json:"user_id"`
	TargetID       primitive.ObjectID `bson:"target_id" json:"target_id"` // GroupID or UserID of the peer
	IsGroup        bool               `bson:"is_group" json:"is_group"`
	Tags           []string           `bson:"tags" json:"tags"`
	CreatedAt      time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt      time.Time          `bson:"updated_at" json:"updated_at"`
}

type UpdateTagsRequest struct {
	TargetID string   `json:"target_id" binding:"required"`
	IsGroup  bool     `json:"is_group"`
	Tags     []string `json:"tags" binding:"required"`
}
