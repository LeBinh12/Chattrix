package biz

import (
	"context"
	"io"
	"my-app/modules/chat/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MediaReader interface {
	OpenMedia(ctx context.Context, ID primitive.ObjectID) (io.ReadSeeker, int64, time.Time, models.MediaType, error)
}

type MediaBiz struct {
	store MediaReader
}

func NewMediaBiz(store MediaReader) *MediaBiz {
	return &MediaBiz{store: store}
}

func (biz *MediaBiz) GetMedia(ctx context.Context, ID string) (io.ReadSeeker, int64, time.Time, models.MediaType, error) {
	mediaID, _ := primitive.ObjectIDFromHex(ID)

	return biz.store.OpenMedia(ctx, mediaID)
}
