package biz

import (
	"context"
	"fmt"
	"my-app/common"
	permissionModels "my-app/modules/permission/models"
	matrixModels "my-app/modules/permission_matrix/models"
	roleModels "my-app/modules/role/models"
	rolePermissionModels "my-app/modules/role_permission/models"
	"time"
)

type UpdateMatrixStorage interface {
	ValidateRoles(ctx context.Context, roleIDs []string) ([]roleModels.Role, error)
	ValidatePermissions(ctx context.Context, permissionIDs []string) ([]permissionModels.Permission, error)
	DeleteRolePermissionsByRoleID(ctx context.Context, roleID string) error
	BulkCreateRolePermissions(ctx context.Context, roleID string, permissionIDs []string) error
	GetRolePermissionsByRoleID(ctx context.Context, roleID string) ([]rolePermissionModels.RolePermission, error)
}

type UpdateMatrixBiz struct {
	store UpdateMatrixStorage
}

func NewUpdateMatrixBiz(store UpdateMatrixStorage) *UpdateMatrixBiz {
	return &UpdateMatrixBiz{store: store}
}

func (biz *UpdateMatrixBiz) UpdatePermissionMatrix(
	ctx context.Context,
	req *matrixModels.UpdatePermissionMatrixRequest,
	userID string,
	userName string,
) (*matrixModels.UpdatePermissionMatrixResponse, error) {

	// 1. Validate input
	if len(req.Roles) == 0 {
		return nil, common.NewCustomError(nil, "Không có dữ liệu để cập nhật", "ERR_INVALID_INPUT")
	}

	// 2. Collect all roleIDs and permissionIDs để validate
	roleIDsMap := make(map[string]bool)
	allPermissionIDs := make(map[string]bool)

	for _, roleUpdate := range req.Roles {
		roleIDsMap[roleUpdate.RoleID] = true
		for _, permID := range roleUpdate.PermissionIDs {
			allPermissionIDs[permID] = true
		}
	}

	// Convert maps to slices
	roleIDs := make([]string, 0, len(roleIDsMap))
	for roleID := range roleIDsMap {
		roleIDs = append(roleIDs, roleID)
	}

	permissionIDs := make([]string, 0, len(allPermissionIDs))
	for permID := range allPermissionIDs {
		permissionIDs = append(permissionIDs, permID)
	}

	// 3. Validate roles exist
	validRoles, err := biz.store.ValidateRoles(ctx, roleIDs)
	if err != nil {
		return nil, common.ErrDB(err)
	}
	if len(validRoles) != len(roleIDs) {
		return nil, common.NewCustomError(nil, "Một hoặc nhiều role không tồn tại", "ERR_INVALID_ROLE")
	}

	// 4. Validate permissions exist (nếu có)
	if len(permissionIDs) > 0 {
		validPermissions, err := biz.store.ValidatePermissions(ctx, permissionIDs)
		if err != nil {
			return nil, common.ErrDB(err)
		}
		if len(validPermissions) != len(permissionIDs) {
			return nil, common.NewCustomError(nil, "Một hoặc nhiều permission không tồn tại", "ERR_INVALID_PERMISSION")
		}
	}

	// 5. Update từng role (replace strategy)
	updatedCount := 0
	var lastError error

	for _, roleUpdate := range req.Roles {
		// Get current permissions for audit log
		oldPermissions, _ := biz.store.GetRolePermissionsByRoleID(ctx, roleUpdate.RoleID)
		
		// Delete old permissions
		err := biz.store.DeleteRolePermissionsByRoleID(ctx, roleUpdate.RoleID)
		if err != nil {
			lastError = err
			continue
		}

		// Insert new permissions (với duplicate removal)
		err = biz.store.BulkCreateRolePermissions(ctx, roleUpdate.RoleID, roleUpdate.PermissionIDs)
		if err != nil {
			lastError = err
			continue
		}

		// Log audit (simplified - có thể mở rộng sau)
		biz.logAudit(ctx, userID, userName, roleUpdate.RoleID, oldPermissions, roleUpdate.PermissionIDs)

		updatedCount++
	}

	if lastError != nil && updatedCount == 0 {
		return nil, common.ErrDB(lastError)
	}

	response := &matrixModels.UpdatePermissionMatrixResponse{
		Success:      true,
		Message:      fmt.Sprintf("Đã cập nhật phân quyền cho role"),
		UpdatedRoles: updatedCount,
	}

	return response, nil
}

// logAudit - Ghi log thay đổi (có thể lưu vào collection audit_logs)
func (biz *UpdateMatrixBiz) logAudit(
	ctx context.Context,
	userID string,
	userName string,
	roleID string,
	oldPermissions []rolePermissionModels.RolePermission,
	newPermissionIDs []string,
) {
	// Build old permission IDs
	oldPermIDs := make([]string, len(oldPermissions))
	for i, rp := range oldPermissions {
		oldPermIDs[i] = rp.PermissionID.Hex()
	}

	auditLog := matrixModels.AuditLog{
		Timestamp:    time.Now().Format(time.RFC3339),
		Action:       "UPDATE_ROLE_PERMISSIONS",
		UserID:       userID,
		UserName:     userName,
		TargetRoleID: roleID,
		Changes: map[string]interface{}{
			"old_permissions": oldPermIDs,
			"new_permissions": newPermissionIDs,
			"added":           difference(newPermissionIDs, oldPermIDs),
			"removed":         difference(oldPermIDs, newPermissionIDs),
		},
	}

	// TODO: Save to audit_logs collection
	// For now, just log to console (có thể mở rộng sau)
	fmt.Printf("[AUDIT] %+v\n", auditLog)
}

// difference - Tìm phần tử có trong a nhưng không có trong b
func difference(a, b []string) []string {
	mb := make(map[string]bool, len(b))
	for _, x := range b {
		mb[x] = true
	}
	
	var diff []string
	for _, x := range a {
		if !mb[x] {
			diff = append(diff, x)
		}
	}
	return diff
}
