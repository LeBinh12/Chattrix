package biz

import "context"

type GetRelationStorage interface {
	GetRelation(ctx context.Context, userA, userB string) (string, error)
}

type GetRelationBiz struct {
	store GetRelationStorage
}

func NewGetRelationBiz(store GetRelationStorage) *GetRelationBiz {
	return &GetRelationBiz{store: store}
}

func (biz *GetRelationBiz) Get(ctx context.Context, userA, userB string) (string, error) {
	status, err := biz.store.GetRelation(ctx, userA, userB)
	if err != nil {
		return "", err
	}

	return status, nil
}
