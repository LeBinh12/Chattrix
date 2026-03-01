package biz

import (
	"context"
	"errors"
	"fmt"
	"my-app/modules/user/models"
	"my-app/utils"

	"golang.org/x/crypto/bcrypt"
)

type LoginStorage interface {
	FindByUsername(ctx context.Context, user string) (*models.User, error)
	GetUserRoles(ctx context.Context, userID string) ([]string, error)
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

	// Lấy danh sách role của user để đưa vào JWT
	roles, err := biz.store.GetUserRoles(ctx, user.ID.Hex())
	if err != nil {
		roles = []string{}
	}

	fmt.Printf("[LOGIN BIZ] UserID: %s, Roles from storage: %v\n", user.ID.Hex(), roles)

	token, err := utils.GenerateJWT(user.ID.Hex(), roles)

	if err != nil {
		return "", err
	}

	return token, nil
}
