package biz

import (
	"context"
	"my-app/modules/chat/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type GetMessageStorage interface {
	GetMessage(ctx context.Context, SenderID, ReceiverID, GroupID primitive.ObjectID, limit int64, beforeTime *time.Time) ([]models.MessageResponse, error)
}

type getMessageBiz struct {
	store GetMessageStorage
}

func NewGetMessageBiz(store GetMessageStorage) *getMessageBiz {
	return &getMessageBiz{store: store}
}

func (biz *getMessageBiz) GetMessage(ctx context.Context, SenderID, ReceiverID, GroupID primitive.ObjectID, limit int64, beforeTime *time.Time) ([]models.MessageResponse, error) {

	if limit <= 0 {
		limit = 20
	}

	messages, err := biz.store.GetMessage(ctx, SenderID, ReceiverID, GroupID, limit, beforeTime)

	if err != nil {
		return nil, err
	}

	return messages, nil
}
