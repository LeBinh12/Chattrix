package models

import "time"

type ConversationPreview struct {
	SenderID        string    `json:"sender_id"`
	UserID          string    `json:"user_id"`
	GroupID         string    `json:"group_id"`
	DisplayName     string    `json:"display_name"`
	Avatar          string    `json:"avatar"`
	LastMessage     string    `json:"last_message"`
	LastMessageType string    `json:"last_message_type"`
	LastDate        time.Time `json:"last_date"`
	UnreadCount     int       `json:"unread_count"`
	Type            string    `json:"type"`
	Status          string    `json:"status,omitempty"`         // online/offline
	UpdatedAt       time.Time `json:"updated_at,omitempty"`     // thời gian offline
	IsMuted         bool      `bson:"is_muted" json:"is_muted"` // đã tắt thông báo chưa
}

type ConversationRequest struct {
	Page    int    `form:"page,default=1" binding:"min=1"`
	Limit   int    `form:"limit,default=10" binding:"min=1,max=100"`
	Keyword string `form:"keyword"`
}
