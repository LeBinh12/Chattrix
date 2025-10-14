package biz

import (
	"context"
	"my-app/modules/group/models"
)

type CreateGroupStorage interface {
	Create(ctx context.Context, data *models.Group) error
}

type CreateGroupBiz struct {
	store CreateGroupStorage
}

func NewCreateGroupBiz(store CreateGroupStorage) *CreateGroupBiz {
	return &CreateGroupBiz{store: store}
}

func (biz *CreateGroupBiz) Create(ctx context.Context, data *models.Group) error {

	if err := biz.store.Create(ctx, data); err != nil {
		return err
	}

	return nil
}
