package models

import "time"

type ConversationPreview struct {
	UserID      string    `json:"user_id"`
	DisplayName string    `json:"display_name"`
	Avatar      string    `json:"avatar"`
	LastMessage string    `json:"last_message"`
	LastDate    time.Time `json:"last_date"`
	UnreadCount int       `json:"unread_count"`
}

type ConversationRequest struct {
	Page  int `form:"page,default=1" binding:"min=1"`
	Limit int `form:"limit,default=10" binding:"min=1,max=100"`
}
