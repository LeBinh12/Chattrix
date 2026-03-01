package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

const DefaultPassword = "123456"

type AdminResetPasswordStorage interface {
	FindUserByID(ctx context.Context, id string) (*models.User, error)
	UpdatePassword(ctx context.Context, id primitive.ObjectID, hashedPassword string) error
}

type adminResetPasswordBiz struct {
	store AdminResetPasswordStorage
}

func NewAdminResetPasswordBiz(store AdminResetPasswordStorage) *adminResetPasswordBiz {
	return &adminResetPasswordBiz{store: store}
}

func (biz *adminResetPasswordBiz) ResetPassword(ctx context.Context, userID string) error {

	user, err := biz.store.FindUserByID(ctx, userID)
	if err != nil {
		return common.ErrCannotGetEntity("user", err)
	}

	if user.IsDeleted {
		return common.ErrEntityDeleted("user", nil)
	}

	
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(DefaultPassword), bcrypt.DefaultCost)
	if err != nil {
		return common.ErrInternal(err)
	}

	
	oid, _ := primitive.ObjectIDFromHex(userID)
	if err := biz.store.UpdatePassword(ctx, oid, string(hashedPassword)); err != nil {
		return common.ErrCannotUpdateEntity("user", err)
	}

	return nil
}
