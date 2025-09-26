package biz

import (
	"context"
	"errors"
	"my-app/modules/user/models"
	"my-app/utils"

	"golang.org/x/crypto/bcrypt"
)

type LoginStorage interface {
	FindByUsername(ctx context.Context, user string) (*models.User, error)
}

type LoginBiz struct {
	store LoginStorage
}

func NewLoginBiz(store LoginStorage) *LoginBiz {
	return &LoginBiz{store: store}
}

func (biz *LoginBiz) Login(ctx context.Context, data *models.LoginRequest) (string, error) {
	user, err := biz.store.FindByUsername(ctx, data.Username)

	if err != nil {
		return "", errors.New("Sai tên đăng nhập hoặc mật khẩu")
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(data.Password)) != nil {
		return "", errors.New("Sai tên đăng nhập hoặc mật khẩu")
	}

	token, err := utils.GenerateJWT(user.ID.Hex())

	if err != nil {
		return "", err
	}

	return token, nil
}
