package biz

import (
	"context"
	"errors"
	"my-app/modules/chat/models"
	"time"
)

type ChatStorage interface {
	SaveMessage(ctx context.Context, msg *models.Message) error
	CheckUserExists(ctx context.Context, userID string) (bool, error)
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
	senderExists, err := biz.store.CheckUserExists(ctx, sender)

	if err != nil {
		return nil, err
	}
	if !senderExists {
		return nil, errors.New("sender not found")
	}

	receiverExists, err := biz.store.CheckUserExists(ctx, receiver)
	if err != nil {
		return nil, err
	}
	if !receiverExists {
		return nil, errors.New("receiver not found")
	}

	if err := biz.store.SaveMessage(ctx, msg); err != nil {
		return nil, err
	}
	return msg, nil
}
