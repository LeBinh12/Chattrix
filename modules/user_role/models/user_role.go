package models

import (
	"my-app/common"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserRole struct {
	common.MongoModel `bson:",inline"`
	UserID            primitive.ObjectID `bson:"user_id" json:"user_id" binding:"required"`
	RoleID            primitive.ObjectID `bson:"role_id" json:"role_id" binding:"required"`
	AssignedAt        string             `bson:"assigned_by" json:"assigned_by"`
	IsDeleted         bool               `bson:"is_deleted" json:"is_deleted"`
	DeletedAt         *string            `bson:"deleted_at,omitempty" json:"deleted_at,omitempty"`
}
