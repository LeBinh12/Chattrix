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
	CheckGroupExists(ctx context.Context, groupID string) (bool, error)
	IsUserInGroup(ctx context.Context, userID, groupID primitive.ObjectID) (bool, error)
}

type ChatBiz struct {
	store ChatStorage
}

func NewChatBiz(store ChatStorage) *ChatBiz {
	return &ChatBiz{store: store}
}

func (biz *ChatBiz) HandleMessage(ctx context.Context, sender string, receiver string, content string, status models.MessageStatus, group string) (*models.Message, error) {
	senderID, _ := primitive.ObjectIDFromHex(sender)
	receiverID, _ := primitive.ObjectIDFromHex(receiver)
	groupID, _ := primitive.ObjectIDFromHex(group)

	msg := &models.Message{
		SenderID:   senderID,
		ReceiverID: receiverID,
		Content:    content,
		CreatedAt:  time.Now(),
		Status:     status,
		IsRead:     false,
		GroupID:    groupID,
	}

	senderExists, err := biz.store.CheckUserExists(ctx, sender)

	if err != nil {
		return nil, err
	}
	if !senderExists {
		return nil, errors.New("không tìm thấy người gửi")
	}

	// Kiểm tra khi nhắn tin 1 - 1

	if !receiverID.IsZero() {
		receiverExists, err := biz.store.CheckUserExists(ctx, receiver)
		if err != nil {
			return nil, err
		}
		if !receiverExists {
			return nil, errors.New("không tìm thấy người gửi")
		}
	}

	// kiểm tra khi nhắn group
	if !groupID.IsZero() {
		groupExists, err := biz.store.CheckGroupExists(ctx, group)

		if err != nil {
			return nil, err
		}

		if !groupExists {
			return nil, errors.New("không tìm thấy người nhận")
		}

		// kiểm tra xem sender có trong nhóm không
		inGroup, err := biz.store.IsUserInGroup(ctx, senderID, groupID)
		if err != nil {
			return nil, err
		}
		if !inGroup {
			return msg, errors.New("nhóm không tồn tại")
		}
	}

	if err := biz.store.SaveMessage(ctx, msg); err != nil {
		return nil, err
	}
	return msg, nil
}
