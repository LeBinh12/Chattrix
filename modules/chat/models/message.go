package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageStatus string
type ReactionStatus string

const (
	StatusSent      MessageStatus = "sent"
	StatusDelivered MessageStatus = "delivered"
	StatusSeen      MessageStatus = "seen"

	StatusFailed MessageStatus = "failed"
)

const (
	ReactionAdd       ReactionStatus = "add"
	ReactionRemove    ReactionStatus = "remove"
	ReactionRemoveAll ReactionStatus = "remove_all"
)

const (
	MediaTypeTask MediaType = "task"
)

type ReplyMessageMini struct {
	ID       primitive.ObjectID `bson:"id" json:"id"`
	Sender   string             `bson:"sender" json:"sender"`
	Content  string             `bson:"content" json:"content"`
	MediaUrl string             `bson:"media_url,omitempty" json:"media_url,omitempty"` // tham chiếu nhiều media
	Type     MediaType          `bson:"type" json:"type"`
}

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
	DeletedFor []primitive.ObjectID `bson:"deleted_for,omitempty" json:"deleted_for"` // lưu user nào đã xóa
	Reply      ReplyMessageMini     `bson:"reply,omitempty" json:"reply,omitempty"`
	Task       *Task                `bson:"task,omitempty" json:"task,omitempty"` // Embed task details

	RecalledAt *time.Time          `bson:"recalled_at,omitempty" json:"recalled_at,omitempty"`
	RecalledBy *primitive.ObjectID `bson:"recalled_by,omitempty" json:"recalled_by,omitempty"`
	Reactions  []Reaction          `bson:"reactions,omitempty" json:"reactions,omitempty"`

	SystemAction string `bson:"system_action,omitempty" json:"system_action,omitempty"` // "pin", "unpin", "leave", etc.
	NewOwnerID   string `bson:"new_owner_id,omitempty" json:"new_owner_id,omitempty"`
	OldOwnerID   string `bson:"old_owner_id,omitempty" json:"old_owner_id,omitempty"`

	// 🔽 Phân cấp bình luận
	ParentMessageID *primitive.ObjectID `bson:"parent_message_id,omitempty" json:"parent_message_id,omitempty"` // cha trực tiếp
	RootMessageID   *primitive.ObjectID `bson:"root_message_id,omitempty" json:"root_message_id,omitempty"`     // message gốc của thread
	ThreadDepth     int                 `bson:"thread_depth,omitempty" json:"thread_depth,omitempty"`           // cấp độ (0 = message gốc)

	EditedAt *time.Time `bson:"edited_at,omitempty" json:"edited_at,omitempty"`
}

type Reaction struct {
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	UserName  string             `bson:"user_name" json:"user_name"`
	Emoji     string             `bson:"emoji" json:"emoji"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
}

type MessageReaction struct {
	MessageID  primitive.ObjectID `bson:"message_id" json:"message_id"`
	UserID     primitive.ObjectID `bson:"user_id" json:"user_id"`
	Type       string             `bson:"type" json:"type"` // giữ icon
	Action     ReactionStatus     `bson:"action" json:"action"`
	SenderName string             `json:"sender_name" bson:"sender_name"`
}

type ReactionEvent struct {
	Type            string             `json:"type"` // "add" or "remove"
	MessageID       primitive.ObjectID `json:"message_id"`
	UserID          primitive.ObjectID `json:"user_id"`
	UserName        string             `json:"user_name"`
	Emoji           string             `json:"emoji"`
	GroupID         primitive.ObjectID `json:"group_id,omitempty"`
	ReceiverID      primitive.ObjectID `json:"receiver_id,omitempty"`
	MessageSenderID primitive.ObjectID `json:"message_sender_id,omitempty"`
}

type MessagePreview struct {
	Content    string              `bson:"content"`
	CreatedAt  time.Time           `bson:"created_at"`
	Type       string              `bson:"type"`
	ID         primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	SenderID   primitive.ObjectID  `bson:"sender_id" json:"sender_id"`
	RecalledAt *time.Time          `bson:"recalled_at,omitempty" json:"recalled_at,omitempty"`
	RecalledBy *primitive.ObjectID `bson:"recalled_by,omitempty" json:"recalled_by,omitempty"`
}

type MessageRequest struct {
	Sender   string               `json:"sender"`
	Receiver string               `json:"receiver,omitempty"`
	Group    string               `json:"group,omitempty"`
	Content  string               `json:"content"`
	Type     MediaType            `json:"type"`
	MediaIDs []primitive.ObjectID `json:"media_ids,omitempty"`
	Status   MessageStatus        `json:status`
	ParentID string               `json:"parent_id,omitempty"`
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
	Reply        ReplyMessageMini   `bson:"reply,omitempty" json:"reply,omitempty"`
	Task         *Task              `bson:"task,omitempty" json:"task,omitempty"`

	DisplayName     string    `json:"display_name"`
	Avatar          string    `json:"avatar"`
	LastMessageType string    `json:"last_message_type"`
	LastDate        time.Time `json:"last_date"`

	UnreadCount int       `json:"unread_count"`
	UpdatedAt   time.Time `json:"updated_at,omitempty"`

	IsMuted bool `bson:"is_muted" json:"is_muted"` // đã tắt thông báo chưa

	RecalledAt *time.Time          `bson:"recalled_at,omitempty" json:"recalled_at,omitempty"`
	RecalledBy *primitive.ObjectID `bson:"recalled_by,omitempty" json:"recalled_by,omitempty"`
	Reactions  []Reaction          `bson:"reactions,omitempty" json:"reactions,omitempty"`

	SystemAction string `bson:"system_action,omitempty" json:"system_action,omitempty"` // "pin", "unpin", "leave", etc.
	NewOwnerID   string `json:"new_owner_id,omitempty"`
	OldOwnerID   string `json:"old_owner_id,omitempty"`

	ParentID     string     `json:"parent_id,omitempty"`
	CommentCount int        `json:"comment_count"`
	EditedAt     *time.Time `json:"edited_at,omitempty"`
}

type MessageStatusRequest struct {
	SenderID   string `json:"sender_id,omitempty"`
	ReceiverID string `json:"receiver_id,omitempty"`

	LastSeenMsgID string `json:"last_seen_message_id,omitempty"`
}

type DeleteMessageForMe struct {
	UserID     string   `json:"user_id"`     // Người xóa
	MessageIDs []string `json:"message_ids"` // Danh sách message cần xóa
}

type MessageResponseSocket struct {
	MessageID      string             `json:"message_id"` // Người xóa
	PinID          string             `json:"pin_id,omitempty"`
	Content        string             `json:"content"`
	SenderID       string             `json:"sender_id"`
	SenderName     string             `json:"sender_name"`
	PinnedByID     string             `json:"pinned_by_id"`
	PinnedByName   string             `json:"pinned_by_name"`
	MessageType    string             `json:"message_type"`
	CreatedAt      string             `json:"created_at"`
	PinnedAt       string             `json:"pinned_at,omitempty"`
	ConversationID string             `json:"conversation_id" `
	GroupID        primitive.ObjectID `json:"group_id,omitempty"`
	ReceiverID     string             `json:"receiver_id"`
}

type ForwardMessageRequest struct {
	SenderID    string    `json:"sender_id"`
	Content     string    `json:"content"`
	Type        MediaType `bson:"type" json:"type"` // "image", "video", "file"
	MediaIDs    []Media   `json:"media_ids,omitempty"`
	ReceiverIDs []string  `json:"receiver_ids,omitempty"`
	GroupIDs    []string  `json:"group_ids,omitempty"`
}

type EditMessageRequest struct {
	ID         string `json:"id"`
	SenderID   string `json:"sender_id"`
	ReceiverID string `json:"receiver_id,omitempty"`
	GroupID    string `json:"group_id,omitempty"`
	Content    string `json:"content"`
}

type NotificationType string

const (
	NotificationTypePersonal NotificationType = "personal" // tin nhắn 1:1 bình thường
	NotificationTypeGroup    NotificationType = "group"    // tin nhắn nhóm bình thường
	NotificationTypeSystem   NotificationType = "system"   // thông báo hệ thống broadcast
)

type MessageNotificationResponse struct {
	ID           primitive.ObjectID `json:"id" bson:"_id"`
	SenderID     primitive.ObjectID `json:"sender_id" bson:"sender_id"`
	SenderName   string             `json:"sender_name" bson:"sender_name"`
	SenderAvatar string             `json:"sender_avatar" bson:"sender_avatar"`

	ReceiverIDs []string `json:"receiver_id,omitempty" bson:"receiver_id,omitempty"` // user nhận (1:1 hoặc broadcast)
	GroupIDs    []string `json:"group_id,omitempty" bson:"group_id,omitempty"`       // group nhận

	Content   string        `json:"content" bson:"content"`
	CreatedAt time.Time     `json:"created_at" bson:"created_at"`
	Status    MessageStatus `json:"status" bson:"status"`
	IsRead    bool          `json:"is_read" bson:"is_read"`
	MediaIDs  []Media       `json:"media_ids,omitempty" bson:"media_ids,omitempty"`
	Type      MediaType     `json:"type" bson:"type"` // "text", "image", "video", "file"

	NotificationType NotificationType `json:"notification_type" bson:"notification_type"` // "personal", "group", "system"
}
