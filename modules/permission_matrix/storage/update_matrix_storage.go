package storage

import (
	"context"
	permissionModels "my-app/modules/permission/models"
	roleModels "my-app/modules/role/models"
	rolePermissionModels "my-app/modules/role_permission/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ValidateRoles - Kiểm tra tất cả roleIDs có tồn tại không
func (s *MatrixStore) ValidateRoles(ctx context.Context, roleIDs []string) ([]roleModels.Role, error) {
	return s.roleStore.FindByIDs(ctx, roleIDs)
}

// ValidatePermissions - Kiểm tra tất cả permissionIDs có tồn tại không
func (s *MatrixStore) ValidatePermissions(ctx context.Context, permissionIDs []string) ([]permissionModels.Permission, error) {
	return s.permissionStore.FindByIDs(ctx, permissionIDs)
}

// DeleteRolePermissionsByRoleID - Xóa tất cả permissions của role
func (s *MatrixStore) DeleteRolePermissionsByRoleID(ctx context.Context, roleID string) error {
	return s.rolePermissionStore.DeleteByRoleID(ctx, roleID)
}

// BulkCreateRolePermissions - Tạo nhiều role_permissions
func (s *MatrixStore) BulkCreateRolePermissions(ctx context.Context, roleID string, permissionIDs []string) error {
	if len(permissionIDs) == 0 {
		return nil
	}

	roleOID, err := primitive.ObjectIDFromHex(roleID)
	if err != nil {
		return err
	}

	// Remove duplicates
	uniquePerms := make(map[string]bool)
	for _, permID := range permissionIDs {
		uniquePerms[permID] = true
	}

	// Create role_permissions
	rolePermissions := make([]rolePermissionModels.RolePermission, 0, len(uniquePerms))
	now := time.Now()

	for permID := range uniquePerms {
		permOID, err := primitive.ObjectIDFromHex(permID)
		if err != nil {
			continue
		}
		rp := rolePermissionModels.RolePermission{
			RoleID:       roleOID,
			PermissionID: permOID,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		rp.ID = primitive.NewObjectID()
		rolePermissions = append(rolePermissions, rp)
	}

	return s.rolePermissionStore.BulkCreate(ctx, rolePermissions)
}

// GetRolePermissionsByRoleID - Lấy permissions hiện tại của role (cho audit log)
func (s *MatrixStore) GetRolePermissionsByRoleID(ctx context.Context, roleID string) ([]rolePermissionModels.RolePermission, error) {
	return s.rolePermissionStore.FindByRoleID(ctx, roleID)
}
