package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PinnedMessage struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ConversationID primitive.ObjectID `bson:"conversation_id" json:"conversation_id"`
	MessageID      primitive.ObjectID `bson:"message_id" json:"message_id"`
	PinnedBy       primitive.ObjectID `bson:"pinned_by" json:"pinned_by"`
	PinnedAt       time.Time          `bson:"pinned_at" json:"pinned_at"`
	Note           string             `bson:"note,omitempty" json:"note,omitempty"`
}

type PinnedMessageDetail struct {
	PinID          primitive.ObjectID `json:"pin_id" bson:"pin_id"`
	MessageID      primitive.ObjectID `json:"message_id" bson:"message_id"`
	ConversationID primitive.ObjectID `json:"conversation_id" bson:"conversation_id"`

	Content  string             `json:"content" bson:"content"`
	SenderID primitive.ObjectID `json:"sender_id" bson:"sender_id"`

	SenderName   *string `json:"sender_name" bson:"sender_name"`
	SenderAvatar *string `json:"sender_avatar" bson:"sender_avatar"`

	PinnedByID     primitive.ObjectID `json:"pinned_by_id" bson:"pinned_by_id"`
	PinnedByName   *string            `json:"pinned_by_name" bson:"pinned_by_name"`
	PinnedByAvatar *string            `json:"pinned_by_avatar" bson:"pinned_by_avatar"`

	PinnedAt primitive.DateTime `json:"pinned_at" bson:"pinned_at"`
	Note     *string            `json:"note,omitempty" bson:"note,omitempty"`

	MessageType string             `json:"message_type" bson:"message_type"`
	CreatedAt   primitive.DateTime `json:"created_at" bson:"created_at"`
}
