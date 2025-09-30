package biz

import (
	"context"
	"errors"
	"my-app/modules/chat/models"
)

type GetMessageStorage interface {
	GetMessage(ctx context.Context, SenderID, ReceiverID string, limit, skip int64) ([]models.Message, error)
}

type getMessageBiz struct {
	store GetMessageStorage
}

func NewGetMessageBiz(store GetMessageStorage) *getMessageBiz {
	return &getMessageBiz{store: store}
}

func (biz *getMessageBiz) GetMessage(ctx context.Context, SenderID, ReceiverID string, limit, skip int64) ([]models.Message, error) {
	if SenderID == "" || ReceiverID == "" {
		return nil, errors.New("senderID and receiverID must not be empty")
	}

	if limit <= 0 {
		limit = 20
	}
	if skip < 0 {
		skip = 0
	}

	messages, err := biz.store.GetMessage(ctx, SenderID, ReceiverID, limit, skip)

	if err != nil {
		return nil, err
	}

	return messages, nil
}
