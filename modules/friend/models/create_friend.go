package models

import "my-app/common"

type FriendShip struct {
	common.MongoModel `bson:",inline"`
	UserID            string `bson:"user_id" json:"user_id"`
	FriendID          string `bson:"friend_id" json:"friend_id"`
	LastActionBy      string `bson:"last_action_by"`
	Status            string `bson:"status" json:"status"` // pending, accepted, rejected, blocked
	NickName          string `bson:"nickname,omitempty" json:"nickname,omitempty"`
}

type UserFriend struct {
	UserID   string `json:"user_id" binding:"required"`
	FriendID string `json:"friend_id" binding:"required"`
}
