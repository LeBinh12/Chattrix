package biz

import (
	"context"
	"my-app/modules/chat/models"
	"time"
)

type ChatStorage interface {
	SaveMessage(ctx context.Context, msg *models.Message) error
}

type ChatBiz struct {
	store ChatStorage
}

func NewChatBiz(store ChatStorage) *ChatBiz {
	return &ChatBiz{store: store}
}

func (biz *ChatBiz) HandleMessage(ctx context.Context, sender string, receiver string, content string) (*models.Message, error) {
	msg := &models.Message{
		SenderID:   sender,
		ReceiverID: receiver,
		Content:    content,
		CreatedAt:  time.Now(),
	}
	if err := biz.store.SaveMessage(ctx, msg); err != nil {
		return nil, err
	}
	return msg, nil
}
