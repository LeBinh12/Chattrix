package biz

import (
	"context"
	"my-app/modules/permission/models"
)


type PermissionStorage interface {
	FindPermissionsByRoleIDs(ctx context.Context, roleIDs []string) ([]models.Permission, error)
	FindPermissionByName(ctx context.Context, name string) (*models.Permission, error)
	FindPermissionByCode(ctx context.Context, code string) (*models.Permission, error)
}

type permissionBiz struct {
	store PermissionStorage
}


type PermissionBiz = permissionBiz



// instance permissionBiz
func NewPermissionBiz(store PermissionStorage) *permissionBiz {
	return &permissionBiz{store: store}
}

// kiem tra co quyen khong? 
func (biz *permissionBiz) HasPermission(ctx context.Context, roleIDs []string, requiredPermission string) (bool, error) {

	if len(roleIDs) == 0 {
		return false, nil
	}


	permissions, err := biz.store.FindPermissionsByRoleIDs(ctx, roleIDs)
	if err != nil {
		return false, err
	}


	for _, perm := range permissions {
		if perm.Code == requiredPermission {
			return true, nil
		}
	}

	return false, nil
}
