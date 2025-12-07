package biz

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MediaListStorage interface {
	GetMediaList(
		ctx context.Context,
		senderID, receiverID, groupID primitive.ObjectID,
		mediaType models.MediaType,
		page, limit int,
	) (*models.MediaPagination, error)
}

type MediaListBiz struct {
	store MediaListStorage
}

func NewMediaListBiz(store MediaListStorage) *MediaListBiz {
	return &MediaListBiz{store: store}
}

func (biz *MediaListBiz) GetMediaList(
	ctx context.Context,
	senderID, receiverID, groupID primitive.ObjectID,
	mediaType models.MediaType,
	page, limit int,
) (*models.MediaPagination, error) {

	// default limit
	if limit <= 0 {
		limit = 20
	}

	// default page
	if page <= 0 {
		page = 1
	}

	result, err := biz.store.GetMediaList(ctx, senderID, receiverID, groupID, mediaType, page, limit)
	if err != nil {
		return nil, err
	}

	return result, nil
}
