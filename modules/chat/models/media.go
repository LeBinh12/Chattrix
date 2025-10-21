package models

type MediaType string

const (
	TypeText  MediaType = "text"
	TypeImage MediaType = "image"
	TypeVideo MediaType = "video"
	TypeFile  MediaType = "file"
)

type Media struct {
	Type     MediaType `bson:"type" json:"type"`         // "image", "video", "file"
	Filename string    `bson:"filename" json:"filename"` // Tên gốc
	Size     int64     `bson:"size" json:"size"`
	URL      string    `bson:"url" json:"url"`
}
