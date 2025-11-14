package biz

import (
	"context"
	"my-app/modules/user/models"
	"my-app/utils"
	"time"
)

type UserStore interface {
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
}

type googleLoginBiz struct {
	store UserStore
}

func NewGoogleLoginBiz(store UserStore) *googleLoginBiz {
	return &googleLoginBiz{store: store}
}

// Nếu user tồn tại thì trả JWT, nếu chưa có thì tạo mới rồi trả JWT luôn
func (biz *googleLoginBiz) LoginOrRegisterByGoogle(ctx context.Context, req *models.GoogleLoginRequest) (string, error) {
	user, _ := biz.store.FindByEmail(ctx, req.Email)
	if user == nil {
		newUser := &models.User{
			Email:       req.Email,
			DisplayName: req.Name,
			Avatar:      req.AvatarURL,
		}
		newUser.CreatedAt = time.Now()
		newUser.UpdatedAt = time.Now()

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
