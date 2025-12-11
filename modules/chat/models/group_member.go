package models

import "go.mongodb.org/mongo-driver/bson/primitive"

var members []struct {
	UserID primitive.ObjectID `bson:"user_id"`
}

type Member struct {
	UserID primitive.ObjectID ` json:"user_id"`
	Role   string             ` json:"role,omitempty"` // optional
}

type GroupMemberRequest struct {
	Members     []Member           `json:"members"`
	GroupID     primitive.ObjectID ` json:"group_id"`
	SenderID    primitive.ObjectID ` json:"sender_id"`
	DisplayName string             `json:"display_name"`
	Avatar      string             `json:"avatar"`
	GroupName   string             `json:"group_name"`
}
