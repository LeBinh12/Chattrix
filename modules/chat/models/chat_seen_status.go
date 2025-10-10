package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChatSeenStatus struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID            primitive.ObjectID `bson:"user_id" json:"user_id"`                           // Ai là người xem (người đang đọc)
	ConversationID    primitive.ObjectID `bson:"conversation_id" json:"conversation_id"`           // Cuộc hội thoại nào (sender_id + receiver_id)
	LastSeenMessageID primitive.ObjectID `bson:"last_seen_message_id" json:"last_seen_message_id"` // Tin nhắn cuối cùng mà người này đã xem
	UpdatedAt         time.Time          `bson:"updated_at" json:"updated_at"`
}
