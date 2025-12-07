package biz

import "context"

type CountAllGroupStorage interface {
	CountAllGroups(ctx context.Context) (int64, error)
}

type CountAllGroupBiz struct {
	store CountAllGroupStorage
}

func NewCountAllGroupBiz(store CountAllGroupStorage) *CountAllGroupBiz {
	return &CountAllGroupBiz{store: store}
}

func (biz *CountAllGroupBiz) TotalGroups(ctx context.Context) (int64, error) {
	return biz.store.CountAllGroups(ctx)
}
