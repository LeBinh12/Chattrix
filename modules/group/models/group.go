package models

import (
	"my-app/common"
	"my-app/modules/chat/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Group struct {
	common.MongoModel `bson:",inline"`
	Name              string             `json:"name" bson:"name"`
	Image             string             `json:"image" bson:"image"`
	CreatorID         primitive.ObjectID `json:"creator_id" bson:"creator_id"`
	Status            string             `json:"status" bson:"status"`
}

type GroupMember struct {
	common.MongoModel `bson:",inline"`   // chứa ID, CreatedAt, UpdatedAt
	GroupID           primitive.ObjectID `json:"group_id" bson:"group_id" binding:"required"`
	UserID            primitive.ObjectID `json:"user_id" bson:"user_id" binding:"required"`
	Role              string             `json:"role" bson:"role"`
	Status            string             `json:"status" bson:"status"`
	JoinedAt          time.Time          `json:"joined_at" bson:"joined_at"`
}

type GroupDetail struct {
	ID            primitive.ObjectID `json:"id" bson:"id"`
	Name          string             `json:"name" bson:"name"`
	Image         string             `json:"image" bson:"image"`
	MembersCount  int64              `json:"members_count" bson:"members_count"`
	MessagesCount int64              `json:"messages_count" bson:"messages_count"`
}

type UserInfoInGroup struct {
	ID          primitive.ObjectID `json:"id" bson:"id"` // ID của GroupMember
	UserID      primitive.ObjectID `json:"user_id" bson:"user_id"`
	DisplayName string             `json:"display_name" bson:"display_name"` // từ collection users
	Email       string             `json:"email" bson:"email"`
	Avatar      string             `json:"avatar" bson:"avatar"`
	JoinedAt    time.Time          `json:"joined_at" bson:"joined_at"`
	Role        string             `json:"role" bson:"role"`
	Status      string             `json:"status" bson:"status"`
}

type GroupMemberDetail struct {
	ID       primitive.ObjectID `json:"id" bson:"_id"` // id group_member
	GroupID  primitive.ObjectID `json:"group_id" bson:"group_id"`
	UserID   primitive.ObjectID `json:"user_id" bson:"user_id"`
	Role     string             `json:"role" bson:"role"`
	Status   string             `json:"status" bson:"status"`
	JoinedAt time.Time          `json:"joined_at" bson:"joined_at"`

	// user info
	Username    string `json:"username" bson:"username"`
	DisplayName string `json:"display_name" bson:"display_name"`
	Email       string `json:"email" bson:"email"`
	Avatar      string `json:"avatar" bson:"avatar"`
	Phone       string `json:"phone" bson:"phone"`

	// user status
	OnlineStatus string    `json:"online_status" bson:"online_status"`
	LastOnlineAt time.Time `json:"last_online_at" bson:"last_online_at"`
}

type KafkaGroupMemberEvent struct {
	GroupID primitive.ObjectID `json:"group_id"`
	Members []models.Member    `json:"members"`
	Inviter string             `json:"inviter_id"` // Người tạo nhóm / mời
	Created time.Time          `json:"created_at"`
}
