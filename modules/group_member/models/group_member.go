package models

import (
	"my-app/common"
	"time"
)

type GroupMember struct {
	common.MongoModel `bson:",inline"`
	GroupID          string     `bson:"group_id" json:"group_id" binding:"required"`
	UserID           string     `bson:"user_id" json:"user_id" binding:"required"`
	JoinedAt         time.Time  `bson:"joined_at" json:"joined_at"`
	IsMuted          bool       `bson:"is_muted" json:"is_muted"`
	MuteExpiresAt    *time.Time `bson:"mute_expires_at,omitempty" json:"mute_expires_at,omitempty"`
	IsBanned         bool       `bson:"is_banned" json:"is_banned"`
	BannedAt         *time.Time `bson:"banned_at,omitempty" json:"banned_at,omitempty"`
	BannedBy         string     `bson:"banned_by" json:"banned_by"`
}
