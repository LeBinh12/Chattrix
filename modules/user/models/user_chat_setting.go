package models

import (
	"my-app/common"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserChatSetting struct {
	common.MongoModel `bson:",inline"`

	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`                           // người tắt thông báo
	TargetID  primitive.ObjectID `bson:"target_id" json:"target_id"`                       // có thể là user hoặc group
	IsGroup   bool               `bson:"is_group" json:"is_group"`                         // true = nhóm, false = cá nhân
	IsMuted   bool               `bson:"is_muted" json:"is_muted"`                         // đã tắt thông báo chưa
	MuteUntil *time.Time         `bson:"mute_until,omitempty" json:"mute_until,omitempty"` // có thể tắt tạm thời
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

type UserChatSettingRequest struct {
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`                           // người tắt thông báo
	TargetID  primitive.ObjectID `bson:"target_id" json:"target_id"`                       // có thể là user hoặc group
	IsGroup   bool               `bson:"is_group" json:"is_group"`                         // true = nhóm, false = cá nhân
	IsMuted   bool               `bson:"is_muted" json:"is_muted"`                         // đã tắt thông báo chưa
	MuteUntil *time.Time         `bson:"mute_until,omitempty" json:"mute_until,omitempty"` // có thể tắt tạm thời
}

type GetUserChatSettingRequest struct {
	UserID   primitive.ObjectID `bson:"user_id" json:"user_id"`     // người tắt thông báo
	TargetID primitive.ObjectID `bson:"target_id" json:"target_id"` // có thể là user hoặc group
	IsGroup  bool               `bson:"is_group" json:"is_group"`
}

type UserChatSettingResponse struct {
	TargetID  primitive.ObjectID `bson:"target_id" json:"target_id"`                       // có thể là user hoặc group
	IsGroup   bool               `bson:"is_group" json:"is_group"`                         // true = nhóm, false = cá nhân
	IsMuted   bool               `bson:"is_muted" json:"is_muted"`                         // đã tắt thông báo chưa
	MuteUntil *time.Time         `bson:"mute_until,omitempty" json:"mute_until,omitempty"` // có thể tắt tạm thời
}
