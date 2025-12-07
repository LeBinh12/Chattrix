package biz

import "context"

type CountOnlineUsersStorage interface {
	CountOnlineUsers(ctx context.Context) (int64, error)
}

type CountOnlineUsersStatsBiz struct {
	store CountOnlineUsersStorage
}

func NewCountOnlineUsersBiz(store CountOnlineUsersStorage) *CountOnlineUsersStatsBiz {
	return &CountOnlineUsersStatsBiz{store: store}
}

func (biz *CountOnlineUsersStatsBiz) TotalOnlineUsers(ctx context.Context) (int64, error) {
	return biz.store.CountOnlineUsers(ctx)
}
