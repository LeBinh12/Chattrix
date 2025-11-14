package biz

import (
	"context"
	"my-app/modules/user/models"
	"my-app/utils"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type OpenIdDictStore interface {
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
}

type OpenIdDictBiz struct {
	store UserStore
}

func NewOpenIdDictStoreLoginBiz(store UserStore) *OpenIdDictBiz {
	return &OpenIdDictBiz{store: store}
}

// Nếu user tồn tại thì trả JWT, nếu chưa có thì tạo mới rồi trả JWT luôn
func (biz *OpenIdDictBiz) LoginOrRegisterByOpenIdDict(ctx context.Context, email string) (string, error) {
	user, _ := biz.store.FindByEmail(ctx, email)
	if user == nil {
		newUser := &models.User{
			Email:       email,
			DisplayName: email,
			Avatar:      "null",
		}
		newUser.CreatedAt = time.Now()
		newUser.UpdatedAt = time.Now()
		newUser.ID = primitive.NewObjectID()
		if err := biz.store.Create(ctx, newUser); err != nil {
			return "", err
		}
		user = newUser
	}
	token, err := utils.GenerateJWT(user.ID.Hex())
	if err != nil {
		return "", err
	}

	return token, nil
}
