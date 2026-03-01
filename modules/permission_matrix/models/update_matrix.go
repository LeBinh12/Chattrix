package models

// UpdatePermissionMatrixRequest - Request để cập nhật permission matrix
type UpdatePermissionMatrixRequest struct {
	Roles []RolePermissionUpdate `json:"roles" binding:"required"`
}

// RolePermissionUpdate - Thông tin update cho từng role
type RolePermissionUpdate struct {
	RoleID        string   `json:"role_id" binding:"required"`
	PermissionIDs []string `json:"permission_ids" binding:"required"`
}

// UpdatePermissionMatrixResponse - Response sau khi cập nhật
type UpdatePermissionMatrixResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	UpdatedRoles int    `json:"updated_roles"`
}

// AuditLog - Model để ghi log thay đổi phân quyền
type AuditLog struct {
	Timestamp      string                 `json:"timestamp"`
	Action         string                 `json:"action"`
	UserID         string                 `json:"user_id"`
	UserName       string                 `json:"user_name"`
	TargetRoleID   string                 `json:"target_role_id"`
	TargetRoleName string                 `json:"target_role_name"`
	Changes        map[string]interface{} `json:"changes"`
}
