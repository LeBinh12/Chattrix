package biz

import (
	"context"
	"my-app/modules/chat/models"
)

type ChatSearchStore interface {
	SearchMessages(ctx context.Context, content string, senderID, receiverID, groupID string, limit int) ([]models.ESMessage, error)
}

type ChatSearchBiz struct {
	store ChatSearchStore
}

func NewChatSearchBiz(store ChatSearchStore) *ChatSearchBiz {
	return &ChatSearchBiz{store: store}
}

// Search tin nhắn theo content
func (biz *ChatSearchBiz) Search(ctx context.Context, content string, senderID, receiverID, groupID string, limit int) ([]models.ESMessage, error) {
	if limit <= 0 {
		limit = 20
	}

	messages, err := biz.store.SearchMessages(ctx, content, senderID, receiverID, groupID, limit)
	if err != nil {
		return nil, err
	}

	return messages, nil
}
