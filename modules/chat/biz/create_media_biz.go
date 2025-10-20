package biz

import (
	"context"
	"my-app/modules/chat/models"
)

type CreateMediaStorage interface {
	UploadMedia(ctx context.Context, media *models.Media) (*models.Media, error)
}

type CreateMediaStorageBiz struct {
	store CreateMediaStorage
}

func NewCreateMediaBiz(store CreateMediaStorage) *CreateMediaStorageBiz {
	return &CreateMediaStorageBiz{store: store}
}

func (biz *CreateMediaStorageBiz) UploadMedia(ctx context.Context, media *models.Media) (*models.Media, error) {
	return biz.UploadMedia(ctx, &models.Media{})
}
