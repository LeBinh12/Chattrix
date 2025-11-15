package biz

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DeleteMessageForMeStore interface {
	DeleteMessageForMe(ctx context.Context, userID primitive.ObjectID, messageIDs []primitive.ObjectID) error
}

type DeleteMessageForMeBiz struct {
	store DeleteMessageForMeStore
}

func NewDeleteMessageForMeBiz(store DeleteMessageForMeStore) *DeleteMessageForMeBiz {
	return &DeleteMessageForMeBiz{store: store}
}

// Xóa tin nhắn cho user hiện tại
func (biz *DeleteMessageForMeBiz) DeleteMessageForMe(ctx context.Context, userID primitive.ObjectID, messageIDs []primitive.ObjectID) error {
	if len(messageIDs) == 0 {
		return errors.New("messageIDs trống")
	}

	// gọi xuống storage
	return biz.store.DeleteMessageForMe(ctx, userID, messageIDs)
}
