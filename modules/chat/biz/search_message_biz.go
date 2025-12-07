package biz

import (
	"context"
	"my-app/modules/chat/models"
)

type ChatSearchStore interface {
	// Trả về messages, nextCursor, error
	SearchMessages(ctx context.Context, content string, senderID, receiverID, groupID string, limit int, cursorTime string) ([]models.ESMessage, string, error)
}

type ChatSearchBiz struct {
	store ChatSearchStore
}

func NewChatSearchBiz(store ChatSearchStore) *ChatSearchBiz {
	return &ChatSearchBiz{store: store}
}

// Search tin nhắn theo content, trả về messages và nextCursor (nếu có)
func (biz *ChatSearchBiz) Search(ctx context.Context, content string, senderID, receiverID, groupID string, limit int, cursorTime string) ([]models.ESMessage, string, error) {
	if limit <= 0 {
		limit = 20
	}

	messages, nextCursor, err := biz.store.SearchMessages(ctx, content, senderID, receiverID, groupID, limit, cursorTime)
	if err != nil {
		return nil, "", err
	}

	return messages, nextCursor, nil
}
