package biz

import (
	"context"
	"my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserStorage interface {
	GetPaginatedUsersWithStatus(ctx context.Context, page, limit int64, search string, gender string, status string, fromDate string, toDate string) ([]models.UserWithStatus, int64, error)
	GetAllUserIDs(ctx context.Context) ([]primitive.ObjectID, error)
	GetAllUserHexIDs(ctx context.Context) ([]string, error)
}

type UserBiz struct {
	store UserStorage
}

func NewUserGetPaginationUserBiz(store UserStorage) *UserBiz {
	return &UserBiz{store: store}
}

// Lấy user kèm trạng thái với phân trang và tìm kiếm
func (biz *UserBiz) ListUsersWithStatus(ctx context.Context, page, limit int64, search string, gender string, status string, fromDate string, toDate string) ([]models.UserWithStatus, int64, error) {
	return biz.store.GetPaginatedUsersWithStatus(ctx, page, limit, search, gender, status, fromDate, toDate)
}

func (biz *UserBiz) GetAllUserIDs(ctx context.Context) ([]primitive.ObjectID, error) {
	return biz.store.GetAllUserIDs(ctx)
}

func (biz *UserBiz) GetAllUserHexIDs(ctx context.Context) ([]string, error) {
	return biz.store.GetAllUserHexIDs(ctx)
}
