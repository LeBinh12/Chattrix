package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Message struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	SenderID   string             `bson:"sender_id" json:"sender_id"`
	ReceiverID string             `bson:"receiver_id,omitempty" json:"receiver_id,omitempty"`
	Content    string             `bson:"content" json:"content"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
}
