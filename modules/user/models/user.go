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

type UserWithStatus struct {
	User          User   `json:"user"`
	Status        string `json:"status"` // online || offline
	MessagesCount int    `json:"messages_count"`
}
