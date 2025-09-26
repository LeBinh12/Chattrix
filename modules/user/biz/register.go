package biz

import (
	"context"
	"my-app/modules/user/models"

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

	user := &models.User{
		ID:       primitive.NewObjectID(),
		Username: data.Username,
		Password: string(hash),
		Email:    data.Email,
	}

	return biz.store.Create(ctx, user)
}
