package biz

import (
	"context"
	"my-app/modules/chat/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PinnedMessageStore interface {
	CreatePinnedMessage(ctx context.Context, p *models.PinnedMessage) error
}

type PinnedMessageBiz struct {
	store PinnedMessageStore
}

func NewPinnedMessageBiz(store PinnedMessageStore) *PinnedMessageBiz {
	return &PinnedMessageBiz{store: store}
}

func (biz *PinnedMessageBiz) PinMessage(ctx context.Context, convID, msgID, userID primitive.ObjectID, note string) error {
	p := &models.PinnedMessage{
		ID:             primitive.NewObjectID(),
		ConversationID: convID,
		MessageID:      msgID,
		PinnedBy:       userID,
		PinnedAt:       time.Now(),
		Note:           note,
	}

	return biz.store.CreatePinnedMessage(ctx, p)
}
