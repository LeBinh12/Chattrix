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
	ID         primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	SenderID   primitive.ObjectID   `bson:"sender_id" json:"sender_id"`
	ReceiverID primitive.ObjectID   `bson:"receiver_id,omitempty" json:"receiver_id,omitempty"`
	GroupID    primitive.ObjectID   `bson:"group_id,omitempty" json:"group_id,omitempty"`
	MediaIDs   []primitive.ObjectID `bson:"media_ids,omitempty" json:"media_ids,omitempty"` // tham chiếu media
	Type       MediaType            `bson:"type" json:"type"`                               // "image", "video", "file"
	Content    string               `bson:"content" json:"content"`
	CreatedAt  time.Time            `bson:"created_at" json:"created_at"`
	Status     MessageStatus        `bson:"status" json:status`
	IsRead     bool                 `bson:"is_read" json:"is_read"`
}

type MessageReaction struct {
	
	MessageID primitive.ObjectID `bson:"message_id" json:"message_id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Type      string             `bson:"type" json:"type"` // giữ icon 
}

type MessagePreview struct {
	Content   string    `bson:"content"`
	CreatedAt time.Time `bson:"created_at"`
	Type      string    `bson:"type"`
}

type MessageRequest struct {
	Sender   string               `json:"sender"`
	Receiver string               `json:"receiver,omitempty"`
	Group    string               `json:"group,omitempty"`
	Content  string               `json:"content"`
	Type     MediaType            `json:"type"`
	MediaIDs []primitive.ObjectID `json:"media_ids,omitempty"`
	Status   MessageStatus        `json:status`
}

type MessageResponse struct {
	ID           primitive.ObjectID `json:"id"`
	SenderID     primitive.ObjectID `json:"sender_id"`
	SenderName   string             `json:"sender_name"`
	SenderAvatar string             `json:"sender_avatar"`
	ReceiverID   primitive.ObjectID `json:"receiver_id,omitempty"`
	GroupID      primitive.ObjectID `json:"group_id,omitempty"`
	Content      string             `json:"content"`
	CreatedAt    time.Time          `json:"created_at"`
	Status       MessageStatus      `json:"status"`
	IsRead       bool               `json:"is_read"`
	MediaIDs     []Media            `json:"media_ids,omitempty"`
	Type         MediaType          `bson:"type" json:"type"` // "image", "video", "file"

	DisplayName     string    `json:"display_name"`
	Avatar          string    `json:"avatar"`
	LastMessageType string    `json:"last_message_type"`
	LastDate        time.Time `json:"last_date"`

	UnreadCount int       `json:"unread_count"`
	UpdatedAt   time.Time `json:"updated_at,omitempty"`

	IsMuted bool `bson:"is_muted" json:"is_muted"` // đã tắt thông báo chưa

}

type MessageStatusRequest struct {
	SenderID   string `json:"sender_id,omitempty"`
	ReceiverID string `json:"receiver_id,omitempty"`

	LastSeenMsgID string `json:"last_seen_message_id,omitempty"`
}
