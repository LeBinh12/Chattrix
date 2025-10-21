package models

import (
	"my-app/common"
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
