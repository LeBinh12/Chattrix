package biz

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UpdateSeenStatusStorage interface {
	UpdateSeenStatus(ctx context.Context, userID, conversationID, lastSeenMsgID primitive.ObjectID) error
}

type updateSeenStatusBiz struct {
	store UpdateSeenStatusStorage
}

func NewUpdateSeenStatusBiz(store UpdateSeenStatusStorage) *updateSeenStatusBiz {
	return &updateSeenStatusBiz{store: store}
}

func (biz *updateSeenStatusBiz) UpdateSeenStatus(
	ctx context.Context,
	userID, conversationID, lastSeenMsgID primitive.ObjectID,
) error {
	return biz.store.UpdateSeenStatus(ctx, userID, conversationID, lastSeenMsgID)
}
