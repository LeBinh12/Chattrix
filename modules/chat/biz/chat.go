package biz

import (
	"context"
	"errors"
	"my-app/modules/chat/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
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
	senderID, _ := primitive.ObjectIDFromHex(sender)
	receiverID, _ := primitive.ObjectIDFromHex(receiver)
	msg := &models.Message{
		SenderID:   senderID,
		ReceiverID: receiverID,
		Content:    content,
		CreatedAt:  time.Now(),
		IsRead:     false,
	}
	senderExists, err := biz.store.CheckUserExists(ctx, sender)

	if err != nil {
		return nil, err
	}
	if !senderExists {
		return nil, errors.New("không tìm thấy người gửi")
	}

	receiverExists, err := biz.store.CheckUserExists(ctx, receiver)
	if err != nil {
		return nil, err
	}
	if !receiverExists {
		return nil, errors.New("không tìm thấy người nhận")
	}

	if err := biz.store.SaveMessage(ctx, msg); err != nil {
		return nil, err
	}
	return msg, nil
}
