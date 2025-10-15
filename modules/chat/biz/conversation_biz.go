package biz

import (
	"context"
	"my-app/modules/chat/models"
)

type ConversationStore interface {
	GetConversations(ctx context.Context, userID string, page, limit int, keyword string) ([]models.ConversationPreview, int64, error)
}

type ConversationBiz struct {
	store ConversationStore
}

func NewListConversationBiz(store ConversationStore) *ConversationBiz {
	return &ConversationBiz{store: store}
}

func (biz *ConversationBiz) ListConversations(ctx context.Context, userID string, page, limit int, keyword string) ([]models.ConversationPreview, int64, error) {
	return biz.store.GetConversations(ctx, userID, page, limit, keyword)
}
