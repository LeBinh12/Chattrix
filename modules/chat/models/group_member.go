package models

import "go.mongodb.org/mongo-driver/bson/primitive"

var members []struct {
	UserID primitive.ObjectID `bson:"user_id"`
}

type Member struct {
	UserID   primitive.ObjectID ` json:"user_id"`
	UserName string             `json:"user_name"`
	Role     string             ` json:"role,omitempty"` // optional
}

type GroupMemberRequest struct {
	Action      string             `json:"action"` // "create_group" | "add_member"
	Members     []Member           `json:"members"`
	GroupID     primitive.ObjectID ` json:"group_id"`
	SenderID    primitive.ObjectID ` json:"sender_id"`
	DisplayName string             `json:"display_name"`
	Avatar      string             `json:"avatar"`
	GroupName   string             `json:"group_name"`
}
