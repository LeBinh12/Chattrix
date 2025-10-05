package biz

import (
	"context"
	"my-app/modules/user/models"
)

type SuggestFriendStorage interface {
	GetFriendSuggestions(ctx context.Context, userID string, keyword string, page, limit int) ([]models.User, int64, error)
}

type SuggestFriendBiz struct {
	store SuggestFriendStorage
}

func NewSuggestFriendBiz(store SuggestFriendStorage) *SuggestFriendBiz {
	return &SuggestFriendBiz{store: store}
}

func (biz *SuggestFriendBiz) Suggest(ctx context.Context, userID, keyword string, page, limit int) ([]models.User, int64, error) {
	return biz.store.GetFriendSuggestions(ctx, userID, keyword, page, limit)
}
