package biz

import (
	"context"
	"my-app/modules/user/models"
)

type UserStorage interface {
	GetPaginatedUsersWithStatus(ctx context.Context, page, limit int64) ([]models.UserWithStatus, int64, error)
}

type UserBiz struct {
	store UserStorage
}

func NewUserGetPaginationUserBiz(store UserStorage) *UserBiz {
	return &UserBiz{store: store}
}

// Lấy user kèm trạng thái với phân trang
func (biz *UserBiz) ListUsersWithStatus(ctx context.Context, page, limit int64) ([]models.UserWithStatus, int64, error) {
	return biz.store.GetPaginatedUsersWithStatus(ctx, page, limit)
}
