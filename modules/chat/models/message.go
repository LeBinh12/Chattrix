package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageStatus string

const (
	StatusSent      MessageStatus = "sent"
	StatusDelivered MessageStatus = "delivered"
	StatusSeen      MessageStatus = "seen"
	StatusFailed    MessageStatus = "failed"
)

type Message struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	SenderID   primitive.ObjectID `bson:"sender_id" json:"sender_id"`
	ReceiverID primitive.ObjectID `bson:"receiver_id,omitempty" json:"receiver_id,omitempty"`
	Content    string             `bson:"content" json:"content"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
	Status     MessageStatus      `bson:"status" json:status`
	IsRead     bool               `bson:"is_read" json:"is_read"`
}

type MessagePreview struct {
	Content   string    `bson:"content"`
	CreatedAt time.Time `bson:"created_at"`
}
