package biz

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DeleteMessageForMeStore interface {
	DeleteMessageForMe(ctx context.Context, userID primitive.ObjectID, messageIDs []primitive.ObjectID) error
}

type ESChatDeleteStore interface {
	DeleteMessageForMe(ctx context.Context, userID string, messageIDs []string) error
}

type DeleteMessageForMeBiz struct {
	store   DeleteMessageForMeStore
	esStore ESChatDeleteStore
}

func NewDeleteMessageForMeBiz(store DeleteMessageForMeStore, esStore ESChatDeleteStore) *DeleteMessageForMeBiz {
	return &DeleteMessageForMeBiz{store: store, esStore: esStore}
}

// Xóa tin nhắn cho user hiện tại
func (biz *DeleteMessageForMeBiz) DeleteMessageForMe(ctx context.Context, userID primitive.ObjectID, messageIDs []primitive.ObjectID) error {
	if len(messageIDs) == 0 {
		return errors.New("messageIDs trống")
	}

	// gọi xuống storage
	err := biz.store.DeleteMessageForMe(ctx, userID, messageIDs)
	if err != nil {
		return err
	}

	if biz.esStore != nil {
		msgIDStrings := make([]string, len(messageIDs))
		for i, id := range messageIDs {
			msgIDStrings[i] = id.Hex()
		}
		_ = biz.esStore.DeleteMessageForMe(ctx, userID.Hex(), msgIDStrings)
	}

	return nil
}
