package biz

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"
)
  
type UnPinnedMessageStore interface {
	UnpinMessage(ctx context.Context, conversationID, messageID primitive.ObjectID) error
}

type UnPinnedMessageBiz struct {
	store UnPinnedMessageStore
}

func NewUnPinnedMessageBiz(store UnPinnedMessageStore) *UnPinnedMessageBiz {
	return &UnPinnedMessageBiz{store: store}
}

// Gỡ ghim tin nhắn
func (biz *UnPinnedMessageBiz) UnpinMessage(
	ctx context.Context,
	convID, msgID primitive.ObjectID,
) error {

	return biz.store.UnpinMessage(ctx, convID, msgID)
}
