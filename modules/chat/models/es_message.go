package models

import "time"

type ESMessage struct {
	ID           string           `json:"id"`
	ParentID     string           `json:"parent_id,omitempty"`
	SenderID     string           `json:"sender_id"`
	SenderName   string           `json:"sender_name"`
	SenderAvatar string           `json:"sender_avatar"`
	ReceiverID   string           `json:"receiver_id"`
	GroupID      string           `json:"group_id"`
	Content      string           `json:"content"`
	ContentRaw   string           `json:"content_raw"`
	ReplyToID    string           `json:"reply_to_id,omitempty"` // <<< thêm
	Reply        ReplyMessageMini `json:"reply"`

	CreatedAt time.Time `json:"created_at"`
	Type      MediaType `json:"type"`
	Task      *Task     `json:"task,omitempty"`

	Status     MessageStatus `json:"status"`
	DeletedFor []string      `json:"deleted_for,omitempty"`
	RecalledAt *time.Time    `json:"recalled_at,omitempty"`
}
