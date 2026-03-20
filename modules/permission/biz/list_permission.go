package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/permission/models"
)

type ListPermissionStorage interface {
	List(ctx context.Context, paging *common.Paging, search string, moduleID string) ([]models.Permission, error)
}

type ListPermissionBiz struct {
	store ListPermissionStorage
}

func NewListPermissionBiz(store ListPermissionStorage) *ListPermissionBiz {
	return &ListPermissionBiz{store: store}
}

func (biz *ListPermissionBiz) ListPermissions(ctx context.Context, paging *common.Paging, search string, moduleID string) ([]models.Permission, error) {
	permissions, err := biz.store.List(ctx, paging, search, moduleID)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	return permissions, nil
}
