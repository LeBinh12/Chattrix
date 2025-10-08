package biz

import (
	"context"
	"my-app/modules/user/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type RegisterStorage interface {
	Create(ctx context.Context, data *models.User) error
}

type RegisterBiz struct {
	store RegisterStorage
}

func NewRegisterBiz(store RegisterStorage) *RegisterBiz {
	return &RegisterBiz{store: store}
}

func (biz *RegisterBiz) Register(ctx context.Context, data *models.RegisterRequest) error {
	hash, _ := bcrypt.GenerateFromPassword([]byte(data.Password), bcrypt.DefaultCost)

	now := time.Now()

	displayName := data.DisplayName

	if displayName == "" {
		displayName = data.Username
	}
	user := &models.User{
		Username:               data.Username,
		Email:                  data.Email,
		Avatar:                 data.Avatar,
		Phone:                  data.Phone,
		DisplayName:            displayName,
		Password:               string(hash),
		Gender:                 data.Gender,
		Birthday:               data.Birthday,
		IsCompletedFriendSetup: false,
	}

	user.ID = primitive.NewObjectID()
	user.CreatedAt = now
	user.UpdatedAt = now
	return biz.store.Create(ctx, user)
}
