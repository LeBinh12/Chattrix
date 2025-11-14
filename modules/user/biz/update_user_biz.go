package biz

import (
	"context"
	"errors"
	"my-app/modules/user/models"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Interface cho tầng lưu trữ
type UpdateUserStore interface {
	Update(ctx context.Context, id primitive.ObjectID, data *models.UpdateRequest) error
	FindByID(ctx context.Context, id string) (*models.User, error)
}

// Biz struct
type UpdateUserBiz struct {
	store UpdateUserStore
}

// Khởi tạo
func NewUserBiz(store UpdateUserStore) *UpdateUserBiz {
	return &UpdateUserBiz{store: store}
}

// Validate dữ liệu UpdateRequest
func (biz *UpdateUserBiz) validateUpdate(data *models.UpdateRequest) error {
	if data.Phone == "" {
		return errors.New("Số điện thoại không được để trống")
	}
	phoneRegex := `^[0-9]{9,12}$`
	match, _ := regexp.MatchString(phoneRegex, data.Phone)
	if !match {
		return errors.New("Số điện thoại không hợp lệ (9-12 số)")
	}

	if data.Birthday.IsZero() {
		return errors.New("Ngày sinh không được để trống")
	}
	if data.Birthday.After(time.Now()) {
		return errors.New("Ngày sinh không hợp lệ")
	}

	if data.Gender != "male" && data.Gender != "female" && data.Gender != "other" {
		return errors.New("Giới tính không hợp lệ")
	}

	return nil
}

func (biz *UpdateUserBiz) CompleteProfile(ctx context.Context, id primitive.ObjectID, data *models.UpdateRequest) error {
	// Validate dữ liệu
	if err := biz.validateUpdate(data); err != nil {
		return err
	}
	err := biz.store.Update(ctx, id, data)
	if err != nil {
		return err
	}

	return nil
}

func (biz *UpdateUserBiz) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	return biz.store.FindByID(ctx, id)
}
