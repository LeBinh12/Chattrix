package biz

import (
	"context"
	"fmt"
	"my-app/common"
	"my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type ChangePasswordStorage interface {
	FindUserByID(ctx context.Context, id string) (*models.User, error)
	UpdatePassword(ctx context.Context, id primitive.ObjectID, hashedPassword string) error
	GetUserRoles(ctx context.Context, userID string) ([]string, error)
}

type changePasswordBiz struct {
	store ChangePasswordStorage
}

func NewChangePasswordBiz(store ChangePasswordStorage) *changePasswordBiz {
	return &changePasswordBiz{store: store}
}

func (biz *changePasswordBiz) ChangePassword(ctx context.Context, userID string, data *models.ChangePasswordRequest) error {
	user, err := biz.store.FindUserByID(ctx, userID)
	if err != nil {
		return common.ErrCannotGetEntity("user", err)
	}
	fmt.Println("User1:", user)
	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(data.OldPassword)); err != nil {
		return common.ErrInvalidRequest(common.NewCustomError(err, "Mật khẩu cũ không chính xác", "ErrInvalidOldPassword"))
	}
	fmt.Println("User2:", user)

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(data.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return common.ErrInternal(err)
	}
	fmt.Println("User3:", user)

	oid, _ := primitive.ObjectIDFromHex(userID)
	if err := biz.store.UpdatePassword(ctx, oid, string(hashedPassword)); err != nil {
		return common.ErrCannotUpdateEntity("user", err)
	}

	return nil
}

func (biz *changePasswordBiz) GetUserRoles(ctx context.Context, id string) ([]string, error) {
	return biz.store.GetUserRoles(ctx, id)
}
