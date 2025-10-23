package biz

import (
	"context"
	"my-app/modules/user/models"
)

type UserStatusStorage interface {
	Upsert(ctx context.Context, status *models.UserStatus) error
}

type UserStatusBiz struct {
	store UserStatusStorage
}

func NewUserStatusBiz(store UserStatusStorage) *UserStatusBiz {
	return &UserStatusBiz{store: store}
}

func (biz *UserStatusBiz) Upsert(ctx context.Context, status *models.UserStatus) error {
	return biz.store.Upsert(ctx, status)
}
