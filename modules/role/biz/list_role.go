package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/role/models"
)

type ListRoleStorage interface {
	List(ctx context.Context, paging *common.Paging, search string) ([]models.Role, error)
}

type ListRoleBiz struct {
	store ListRoleStorage
}

func NewListRoleBiz(store ListRoleStorage) *ListRoleBiz {
	return &ListRoleBiz{store: store}
}

func (biz *ListRoleBiz) ListRoles(ctx context.Context, paging *common.Paging, search string) ([]models.Role, error) {
	roles, err := biz.store.List(ctx, paging, search)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	return roles, nil
}
