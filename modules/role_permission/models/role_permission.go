package models

import (
	"my-app/common"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type RolePermission struct {
	common.MongoModel `bson:",inline"`
	RoleID       primitive.ObjectID    `bson:"role_id" json:"role_id" binding:"required"`
	PermissionID primitive.ObjectID    `bson:"permission_id" json:"permission_id" binding:"required"`
	CreatedAt    time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time `bson:"updated_at" json:"updated_at"`
	DeletedAt    *time.Time `bson:"deleted_at,omitempty" json:"deleted_at,omitempty"`
}