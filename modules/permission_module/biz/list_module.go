package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/permission_module/models"
)

type ListModuleStorage interface {
	List(ctx context.Context, paging *common.Paging, search string) ([]models.PermissionModule, error)
	ListAll(ctx context.Context) ([]models.PermissionModule, error)
}

type ListModuleBiz struct {
	store ListModuleStorage
}

func NewListModuleBiz(store ListModuleStorage) *ListModuleBiz {
	return &ListModuleBiz{store: store}
}

func (biz *ListModuleBiz) ListModules(ctx context.Context, paging *common.Paging, search string) ([]models.PermissionModule, error) {
	modules, err := biz.store.List(ctx, paging, search)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	return modules, nil
}

func (biz *ListModuleBiz) ListAllModules(ctx context.Context) ([]models.PermissionModule, error) {
	modules, err := biz.store.ListAll(ctx)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	return modules, nil
}
