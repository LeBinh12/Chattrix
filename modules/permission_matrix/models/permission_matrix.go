package models

// PermissionMatrixResponse - Response cho API GET /permission-matrix
type PermissionMatrixResponse struct {
	Roles   []RoleInfo   `json:"roles"`
	Modules []ModuleInfo `json:"modules"`
}

// RoleInfo - Thông tin role trong matrix
type RoleInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// ModuleInfo - Thông tin module và permissions
type ModuleInfo struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Permissions []PermissionInfo `json:"permissions"`
}

// PermissionInfo - Thông tin permission với danh sách role đã được gán
type PermissionInfo struct {
	ID             string   `json:"id"`
	Key            string   `json:"key"`
	Name           string   `json:"name"`
	CheckedRoleIDs []string `json:"checked_role_ids"`
}
