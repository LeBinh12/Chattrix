package biz

import (
	"context"
	"fmt"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
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
	media.ID = primitive.NewObjectID()
	fmt.Println("media", media)

	return biz.store.UploadMedia(ctx, media)
}
