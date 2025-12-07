package biz

import (
	"context"
	"my-app/modules/chat/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type GetMessageBelowStorage interface {
	GetMessageBelow(ctx context.Context, SenderID, ReceiverID, GroupID primitive.ObjectID, limit int64, afterTime time.Time) ([]models.MessageResponse, error)
}

type getMessageBelowBiz struct {
	store GetMessageBelowStorage
}

func NewGetMessageBelowBiz(store GetMessageBelowStorage) *getMessageBelowBiz {
	return &getMessageBelowBiz{store: store}
}

func (biz *getMessageBelowBiz) GetMessageBelow(ctx context.Context, SenderID, ReceiverID, GroupID primitive.ObjectID, limit int64, afterTime time.Time) ([]models.MessageResponse, error) {

	if limit <= 0 {
		limit = 20
	}

	messages, err := biz.store.GetMessageBelow(ctx, SenderID, ReceiverID, GroupID, limit, afterTime)
	if err != nil {
		return nil, err
	}

	return messages, nil
}
