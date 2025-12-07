package biz

import "context"

type CountAllUsersStorage interface {
	CountAllUsers(ctx context.Context) (int64, error)
}

type CountAllUsersStorageBiz struct {
	store CountAllUsersStorage
}

func NewCountAllUsersStorageBiz(store CountAllUsersStorage) *CountAllUsersStorageBiz {
	return &CountAllUsersStorageBiz{store: store}
}

func (biz *CountAllUsersStorageBiz) TotalUsers(ctx context.Context) (int64, error) {
	return biz.store.CountAllUsers(ctx)
}
