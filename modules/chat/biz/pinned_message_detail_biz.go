package biz

import (
	"context"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PinnedMessageDetailStore interface {
	GetPinnedMessageDetails(ctx context.Context, conversationID primitive.ObjectID) ([]models.PinnedMessageDetail, error)
}

type PinnedMessageDetailBiz struct {
	store PinnedMessageDetailStore
}

func NewPinnedMessageDetailBiz(store PinnedMessageDetailStore) *PinnedMessageDetailBiz {
	return &PinnedMessageDetailBiz{store: store}
}

func (biz *PinnedMessageDetailBiz) GetPinnedMessages(
	ctx context.Context,
	sender_id, receiver_id, group_id primitive.ObjectID,
) ([]models.PinnedMessageDetail, error) {

	var targetConvID primitive.ObjectID

	if !group_id.IsZero() {
		targetConvID = group_id // group chat
	} else {
		targetConvID = storage.GetConversationID(sender_id, receiver_id) // private chat
	}

	return biz.store.GetPinnedMessageDetails(ctx, targetConvID)
}
