package biz

import (
	"context"
	"my-app/modules/user/models"
)

type UserStatusStore interface {
	GetAll(ctx context.Context, currentUserID string) ([]models.UserStatusResponse, error)
}

type getUserStatusBiz struct {
	store UserStatusStore
}

func NewGetUserStatusBiz(store UserStatusStore) *getUserStatusBiz {
	return &getUserStatusBiz{store: store}
}

func (biz *getUserStatusBiz) GetAll(ctx context.Context, currentUserID string) ([]models.UserStatusResponse, error) {
	return biz.store.GetAll(ctx, currentUserID)
}
