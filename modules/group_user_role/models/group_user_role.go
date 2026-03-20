package models

import (
	"my-app/common"
	"time"
)

type GroupUserRole struct {
	common.MongoModel `bson:",inline"`
	GroupID           string     `bson:"group_id" json:"group_id" binding:"required"`
	RoleID            string     `bson:"role_id" json:"role_id" binding:"required"`
	UserID            string     `bson:"user_id" json:"user_id" binding:"required"`
	IsDeleted         bool       `bson:"is_deleted" json:"is_deleted"`
	DeletedAt         *time.Time `bson:"deleted_at,omitempty" json:"deleted_at,omitempty"`
}
