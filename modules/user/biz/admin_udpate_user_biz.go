package biz

import (
	"context"
	"errors"
	"my-app/modules/user/models"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AdminUpdateUserStore interface {
	AdminUpdate(ctx context.Context, id primitive.ObjectID, data *models.AdminUpdateUserRequest) error
	FindByID(ctx context.Context, id string) (*models.User, error)
	FindByUsername(ctx context.Context, username string) (*models.User, error)
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByPhone(ctx context.Context, phone string) (*models.User, error)
}

type AdminUpdateUserBiz struct {
	store AdminUpdateUserStore
}

func NewAdminUpdateUserBiz(store AdminUpdateUserStore) *AdminUpdateUserBiz {
	return &AdminUpdateUserBiz{store: store}
}

func (biz *AdminUpdateUserBiz) validateAdminUpdate(data *models.AdminUpdateUserRequest) error {
	if data.Username != "" && len(data.Username) < 3 {
		return errors.New("Username phải có ít nhất 3 ký tự")
	}

	if data.Email != "" {
		emailRegex := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
		match, _ := regexp.MatchString(emailRegex, data.Email)
		if !match {
			return errors.New("Email không hợp lệ")
		}
	}

	if data.Phone != "" {
		phoneRegex := `^(0|\+84)[0-9]{9}$`
		match, _ := regexp.MatchString(phoneRegex, data.Phone)
		if !match {
			return errors.New("Số điện thoại không hợp lệ (9-12 số)")
		}
	}

	if !data.Birthday.IsZero() && data.Birthday.After(time.Now()) {
		return errors.New("Ngày sinh không hợp lệ")
	}

	if data.Gender != "" && data.Gender != "male" && data.Gender != "female" && data.Gender != "other" {
		return errors.New("Giới tính không hợp lệ")
	}

	return nil
}

func (biz *AdminUpdateUserBiz) UpdateUser(ctx context.Context, id primitive.ObjectID, data *models.AdminUpdateUserRequest) error {

	if err := biz.validateAdminUpdate(data); err != nil {
		return err
	}
	// kiem tra co trung username
	if data.Username != "" {
		user, _ := biz.store.FindByUsername(ctx, data.Username)
		if user != nil && user.ID != id {
			return errors.New("Username đã tồn tại")
		}
	}
	// kiem tra co trung email
	if data.Email != "" {
		user, _ := biz.store.FindByEmail(ctx, data.Email)
		if user != nil && user.ID != id {
			return errors.New("Email đã tồn tại")
		}
	}
	// kiem tra co trung phone
	if data.Phone != "" {
		user, _ := biz.store.FindByPhone(ctx, data.Phone)
		if user != nil && user.ID != id {
			return errors.New("Số điện thoại đã tồn tại")
		}
	}
	return biz.store.AdminUpdate(ctx, id, data)
}

func (biz *AdminUpdateUserBiz) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	return biz.store.FindByID(ctx, id)
}
