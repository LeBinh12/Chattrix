package models

import (
	"my-app/common"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MediaType string

const (
	TypeText  MediaType = "text"
	TypeImage MediaType = "image"
	TypeVideo MediaType = "video"
	TypeFile  MediaType = "file"
)

type Media struct {
	common.MongoModel `bson:",inline"` // chứa ID, CreatedAt, UpdatedAt
	Type              MediaType        `bson:"type" json:"type"`         // "image", "video", "file"
	Filename          string           `bson:"filename" json:"filename"` // Tên gốc
	Size              int64            `bson:"size" json:"size"`
	URL               string           `bson:"url" json:"url"`
}

type MediaPagination struct {
	Total int64               `json:"total"`
	Page  int                 `json:"page"`
	Limit int                 `json:"limit"`
	Items []MediaItemResponse `json:"items"`
}

type MediaItemResponse struct {
	ID        primitive.ObjectID `json:"id"`
	MessageID primitive.ObjectID `json:"message_id"`
	SenderID  primitive.ObjectID `json:"sender_id"`
	CreatedAt int64              `json:"created_at"` // unix timestamp

	// Thông tin media
	Type     MediaType `json:"type"` // image, video, file
	Filename string    `json:"filename"`
	Size     int64     `json:"size"`
	URL      string    `json:"url"`

	// Thông tin bổ sung từ message (nếu cần mở rộng sau)
	Content string `json:"content,omitempty"`
	IsRead  bool   `json:"is_read,omitempty"`
}
