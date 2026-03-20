package biz

import (
	"context"
	"errors"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type RecallMessageStore interface {
	// Lấy message để kiểm tra quyền
	GetMessageOneByID(ctx context.Context, id primitive.ObjectID) (*models.Message, error)

	// Cập nhật trạng thái thu hồi
	UpdateMessageRecall(ctx context.Context, id primitive.ObjectID, recalledBy primitive.ObjectID) error
}

type ESChatRecallStore interface {
	RecallMessage(ctx context.Context, messageID string) error
}

type RecallMessageBiz struct {
	store   RecallMessageStore
	esStore ESChatRecallStore
}

func NewRecallMessageBiz(store RecallMessageStore, esStore ESChatRecallStore) *RecallMessageBiz {
	return &RecallMessageBiz{store: store, esStore: esStore}
}

func (biz *RecallMessageBiz) RecallMessage(ctx context.Context, msgID, userID primitive.ObjectID) error {
	if msgID.IsZero() {
		return errors.New("invalid messageID")
	}
	if userID.IsZero() {
		return errors.New("invalid userID")
	}

	// Lấy message ra
	msg, err := biz.store.GetMessageOneByID(ctx, msgID)
	if err != nil {
		return errors.New("message not found")
	}

	// Chỉ cho phép người gửi thu hồi
	if msg.SenderID != userID {
		return errors.New("you do not have permission to recall this message")
	}

	// Nếu đã thu hồi rồi thì bỏ qua
	if msg.RecalledAt != nil {
		return nil
	}

	err = biz.store.UpdateMessageRecall(ctx, msgID, userID)
	if err != nil {
		return err
	}

	if biz.esStore != nil {
		_ = biz.esStore.RecallMessage(ctx, msgID.Hex())
	}

	return nil
}
