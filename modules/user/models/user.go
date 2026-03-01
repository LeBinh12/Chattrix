package models

import (
	"my-app/common"
	"time"
)

type User struct {
	common.MongoModel      `bson:",inline"`
	Username               string    `bson:"username" json:"username" binding:"required"`
	Password               string    `bson:"password,omitempty" json:"password,omitempty" binding:"required"`
	Email                  string    `bson:"email" json:"email" binding:"required"`
	Avatar                 string    `bson:"avatar" json:"avatar"`
	Phone                  string    `bson:"phone" json:"phone" binding:"required"`
	DisplayName            string    `bson:"display_name" json:"display_name"`
	Birthday               time.Time `bson:"birthday" json:"birthday"`
	Gender                 string    `bson:"gender" json:"gender"`
	IsCompletedFriendSetup bool      `bson:"is_completed_friend_setup" json:"is_completed_friend_setup"` // đã kết bạn ≥5 người chưa
	IsProfileComplete      bool      `bson:"is_profile_complete" json:"is_profile_complete"`             // đã điền đầy đủ thông tin

	Type        string `bson:"type" json:"type"` // Ví dụ: "normal", "system", "bot", "notification"
	Description string `bson:"description" json:"description"`

	IsDeleted bool       `bson:"is_deleted" json:"is_deleted"`
	DeletedAt *time.Time `bson:"deleted_at,omitempty" json:"deleted_at,omitempty"`

	FailedAttempts int        `bson:"failed_attempts" json:"failed_attempts"`
	LockedUntil    *time.Time `bson:"locked_until,omitempty" json:"locked_until,omitempty"`
}

type RegisterRequest struct {
	Username    string    `json:"username" binding:"required"`
	Password    string    `json:"password" binding:"required"`
	Email       string    `json:"email" binding:"required,email"`
	Avatar      string    `json:"avatar"`
	Phone       string    `json:"phone" binding:"required"`
	DisplayName string    `json:"display_name"`
	Birthday    time.Time `json:"birthday" binding:"required"`
	Gender      string    `json:"gender" binding:"required"`
	Type        string    `bson:"type" json:"type"` // Ví dụ: "normal", "system", "bot", "notification"
	Description string    `bson:"description" json:"description"`
}

type UpdateRequest struct {
	Avatar      string    `json:"avatar"`
	Phone       string    `json:"phone" binding:"required"`
	DisplayName string    `json:"display_name"`
	Birthday    time.Time `json:"birthday" binding:"required"`
	Gender      string    `json:"gender" binding:"required"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// RoleInfo - Thông tin role (dùng cho hiển thị và phân quyền)
// - ID: dùng cho backend logic
// - Code: dùng cho phân quyền UI / authorization
// - Name: dùng cho hiển thị danh sách user
type RoleInfo struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

type UserWithStatus struct {
	User          User       `json:"user"`
	Status        string     `json:"status"`     // online || offline
	LastLogin     *time.Time `json:"last_login"` // last login
	MessagesCount int        `json:"messages_count"`
	Roles         []RoleInfo `json:"roles"`
}

type ChanelNotificationResponse struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	DisplayName string `json:"display_name"`
	Avatar      string `json:"avatar"`
	Gender      string `json:"gender"`
	Birthday    string `json:"birthday,omitempty"` // format YYYY-MM-DD
	Type        string `json:"type,omitempty"`     // chỉ trả về nếu cần (ví dụ: "notification")
	Description string `json:"description,omitempty"`
	CreatedAt   int64  `json:"created_at"` // timestamp unix
	UpdatedAt   int64  `json:"updated_at"`
	// Các field khác nếu cần: is_online, last_active, v.v.
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

type AdminUpdateUserRequest struct {
	Username    string    `json:"username"`
	Email       string    `json:"email"`
	Avatar      string    `json:"avatar"`
	Phone       string    `json:"phone"`
	DisplayName string    `json:"display_name"`
	Birthday    time.Time `json:"birthday"`
	Gender      string    `json:"gender"`
	Type        string    `json:"type"`
	Description string    `json:"description"`
	Roles       []string  `json:"roles"` // Danh sách role IDs cần gán cho user
}

type UserProfileResponse struct {
	User
	Roles       []string `json:"roles"`
	Permissions []string `json:"permissions"`
}
