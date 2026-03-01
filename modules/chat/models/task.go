package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type TaskStatus string
type TaskAct string

const (
	TaskActCreate TaskAct = "created"
	TaskActUpdate TaskAct = "updated"
	TaskActDelete TaskAct = "deleted"
	TaskActSystem TaskAct = "system"
)
const (
	TaskStatusPendingAcceptance TaskStatus = "pending_acceptance" // Chờ người được giao chấp nhận
	TaskStatusAccepted          TaskStatus = "accepted"           // Đã chấp nhận, có thể bắt đầu làm
	TaskStatusTodo              TaskStatus = "todo"
	TaskStatusInProgress        TaskStatus = "in_progress"
	TaskStatusDone              TaskStatus = "done"
	TaskStatusRejected          TaskStatus = "rejected" // Bị từ chối
	TaskStatusCancel            TaskStatus = "cancel"
)

// AssigneeStatus lưu trạng thái riêng cho từng người nhận trong một group task.
type AssigneeStatus struct {
	AssigneeID   primitive.ObjectID `bson:"assignee_id" json:"assignee_id"`
	AssigneeName string             `bson:"assignee_name" json:"assignee_name"`
	Status       TaskStatus         `bson:"status" json:"status"`
	AcceptedAt   *time.Time         `bson:"accepted_at,omitempty" json:"accepted_at,omitempty"`
	RejectedAt   *time.Time         `bson:"rejected_at,omitempty" json:"rejected_at,omitempty"`
	RejectReason string             `bson:"reject_reason,omitempty" json:"reject_reason,omitempty"`
}

type Task struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description" json:"description"`

	// Single-assignee (backward compat, hoặc = assignees[0] khi là group task)
	AssigneeID   primitive.ObjectID `bson:"assignee_id" json:"assignee_id"`
	AssigneeName string             `bson:"assignee_name" json:"assignee_name"` // Cache name for display

	// Multi-assignee: chỉ có khi được giao cho nhiều người (tạo 1 doc duy nhất)
	Assignees []AssigneeStatus `bson:"assignees,omitempty" json:"assignees,omitempty"`

	CreatorID   primitive.ObjectID `bson:"creator_id" json:"creator_id"`
	CreatorName string             `bson:"creator_name" json:"creator_name"`
	GroupID     primitive.ObjectID `bson:"group_id,omitempty" json:"group_id,omitempty"`

	Status    TaskStatus `bson:"status" json:"status"`
	Priority  string     `bson:"priority" json:"priority"` // low, medium, high
	StartTime *time.Time `bson:"start_time,omitempty" json:"start_time,omitempty"`
	EndTime   *time.Time `bson:"end_time,omitempty" json:"end_time,omitempty"`
	Deadline  *time.Time `bson:"deadline,omitempty" json:"deadline,omitempty"`

	AttachmentIDs []primitive.ObjectID `bson:"attachment_ids,omitempty" json:"attachment_ids,omitempty"`
	Attachments   []Media              `bson:"attachments,omitempty" json:"attachments,omitempty"`

	AcceptedAt   *time.Time `bson:"accepted_at,omitempty" json:"accepted_at,omitempty"`     // Thời điểm chấp nhận
	RejectedAt   *time.Time `bson:"rejected_at,omitempty" json:"rejected_at,omitempty"`     // Thời điểm từ chối
	RejectReason string     `bson:"reject_reason,omitempty" json:"reject_reason,omitempty"` // Lý do từ chối (tùy chọn)

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// AssigneeInfo dùng khi giao việc cho nhiều người cùng lúc.
type AssigneeInfo struct {
	AssigneeID   string `json:"assignee_id"`
	AssigneeName string `json:"assignee_name"`
}

type CreateTaskRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	// Backward-compat single assignee (dùng khi gửi 1 người)
	AssigneeID   string `json:"assignee_id"`
	AssigneeName string `json:"assignee_name"`
	// Multi-assign: nếu có thì ưu tiên dùng danh sách này
	Assignees []AssigneeInfo `json:"assignees"`
	// AssignType: "personal" hoặc "group" - quyết định tạo task riêng hay chung
	// personal → N task độc lập cho N người
	// group    → 1 task chung với Assignees[]
	AssignType    string     `json:"assign_type"`
	CreatorName   string     `json:"creator_name"`
	GroupID       string     `json:"group_id"`
	Priority      string     `json:"priority"`
	StartTime     *time.Time `json:"start_time"`
	EndTime       *time.Time `json:"end_time"`
	Deadline      *time.Time `json:"deadline"`
	AttachmentIDs []string   `json:"attachment_ids"`
}

type UpdateTaskStatusRequest struct {
	Status       TaskStatus `json:"status" binding:"required"`
	RejectReason string     `json:"reject_reason,omitempty"` // Chỉ dùng khi status = rejected
	// AssigneeID: bắt buộc với group task (nhiều người), để biết ai đang update trạng thái của chính họ
	AssigneeID string `json:"assignee_id,omitempty"`
}

type TaskComment struct {
	ID primitive.ObjectID `bson:"_id,omitempty" json:"id"`

	TaskID primitive.ObjectID `bson:"task_id" json:"task_id"`

	UserID     primitive.ObjectID `bson:"user_id" json:"user_id"`
	UserName   string             `bson:"user_name" json:"user_name"`
	UserAvatar string             `bson:"user_avatar,omitempty" json:"user_avatar,omitempty"`

	Content string `bson:"content" json:"content"`

	AttachmentIDs []primitive.ObjectID `bson:"attachment_ids,omitempty" json:"attachment_ids,omitempty"`

	// dùng cho reply comment (optional)
	ReplyToID     *primitive.ObjectID `bson:"reply_to_id,omitempty" json:"reply_to_id,omitempty"`
	ReplyToUserID *primitive.ObjectID `bson:"reply_to_user_id,omitempty" json:"reply_to_user_id,omitempty"`
	ReplyToAvatar string              `bson:"reply_to_avatar,omitempty" json:"reply_to_avatar,omitempty"`
	ReplyContent  string              `bson:"reply_to_content,omitempty" json:"reply_to_content,omitempty"`
	ReplyUsername string              `bson:"reply_to_username,omitempty" json:"reply_to_username,omitempty"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`

	/// Websocket
	ReceiverID primitive.ObjectID `bson:"receiver_id,omitempty" json:"receiver_id,omitempty"`
	GroupID    primitive.ObjectID `bson:"group_id,omitempty" json:"group_id,omitempty"`
	SenderID   primitive.ObjectID `bson:"sender_id" json:"sender_id"`
	Type       TaskAct            `bson:"type_act" json:"type_act"`
}

type CreateTaskCommentRequest struct {
	Content       string               `json:"content" binding:"required"`
	AttachmentIDs []primitive.ObjectID `json:"attachment_ids,omitempty"`
	ReplyToID     *primitive.ObjectID  `json:"reply_to_id,omitempty"`
	TaskID        primitive.ObjectID   `json:"task_id,omitempty"`
	ReplyToUserID *primitive.ObjectID  `json:"reply_to_user_id,omitempty"`
	ReplyToAvatar string               `json:"reply_to_avatar,omitempty"`
	ReplyContent  string               `json:"reply_to_content,omitempty"`
	ReplyUsername string               `json:"reply_to_username,omitempty"`
}
