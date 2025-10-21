package biz

import "context"

type DeleteMediaStorage interface {
	DeleteMedia(ctx context.Context, mediaID string) error
}

type DeleteMediaStorageBiz struct {
	store DeleteMediaStorage
}

func NewDeleteMediaBiz(store DeleteMediaStorage) *DeleteMediaStorageBiz {
	return &DeleteMediaStorageBiz{store: store}
}

func (biz *DeleteMediaStorageBiz) DeleteMedia(ctx context.Context, mediaID string) error {
	return biz.store.DeleteMedia(ctx, mediaID)
}
