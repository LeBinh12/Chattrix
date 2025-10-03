package models

import (
	"my-app/common"
)

type User struct {
	common.MongoModel `bson:",inline"`
	Username          string `bson:"username" json:"username" binding:"required"`
	Password          string `bson:"password,omitempty" json:"password,omitempty" binding:"required"`
	Email             string `bson:"email" json:"email" binding:"required"`
	Avatar            string `bson:"avatar" json:"avatar"`
	Phone             string `bson:"phone" json:"phone" binding:"required"`
	DisplayName       string `bson:"display_name" json:"display_name"`
}

type RegisterRequest struct {
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password" binding:"required"`
	Email       string `json:"email" binding:"required,email"`
	Avatar      string `bson:"avatar" json:"avatar"`
	Phone       string `bson:"phone" json:"phone" binding:"required"`
	DisplayName string `bson:"display_name" json:"display_name"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}
