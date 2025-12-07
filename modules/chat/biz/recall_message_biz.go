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

type RecallMessageBiz struct {
	store RecallMessageStore
}

func NewRecallMessageBiz(store RecallMessageStore) *RecallMessageBiz {
	return &RecallMessageBiz{store: store}
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

	return biz.store.UpdateMessageRecall(ctx, msgID, userID)
}
