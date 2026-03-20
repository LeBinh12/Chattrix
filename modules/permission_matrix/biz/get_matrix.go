package biz

import (
	"context"
	"my-app/common"
	permissionModels "my-app/modules/permission/models"
	matrixModels "my-app/modules/permission_matrix/models"
	moduleModels "my-app/modules/permission_module/models"
	roleModels "my-app/modules/role/models"
	rolePermissionModels "my-app/modules/role_permission/models"
)

type GetMatrixStorage interface {
	GetAllRoles(ctx context.Context) ([]roleModels.Role, error)
	GetAllModules(ctx context.Context) ([]moduleModels.PermissionModule, error)
	GetAllPermissions(ctx context.Context) ([]permissionModels.Permission, error)
	GetAllRolePermissions(ctx context.Context) ([]rolePermissionModels.RolePermission, error)
}

type GetMatrixBiz struct {
	store GetMatrixStorage
}

func NewGetMatrixBiz(store GetMatrixStorage) *GetMatrixBiz {
	return &GetMatrixBiz{store: store}
}

func (biz *GetMatrixBiz) GetPermissionMatrix(ctx context.Context) (*matrixModels.PermissionMatrixResponse, error) {
	// 1. Lấy tất cả roles
	roles, err := biz.store.GetAllRoles(ctx)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	// 2. Lấy tất cả modules
	modules, err := biz.store.GetAllModules(ctx)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	// 3. Lấy tất cả permissions
	permissions, err := biz.store.GetAllPermissions(ctx)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	// 4. Lấy tất cả role_permissions
	rolePermissions, err := biz.store.GetAllRolePermissions(ctx)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	// 5. Build mapping: permission_id -> []role_id
	permissionToRoles := make(map[string][]string)
	for _, rp := range rolePermissions {
		pid := rp.PermissionID.Hex()
		rid := rp.RoleID.Hex()
		permissionToRoles[pid] = append(permissionToRoles[pid], rid)
	}

	// 6. Build mapping: module_id -> []permissions
	moduleToPermissions := make(map[string][]permissionModels.Permission)
	for _, permission := range permissions {
		moduleID := permission.ModuleID
		if moduleID == "" {
			moduleID = "unassigned" // Module chưa được gán
		}
		moduleToPermissions[moduleID] = append(moduleToPermissions[moduleID], permission)
	}

	// 7. Build response
	response := &matrixModels.PermissionMatrixResponse{
		Roles:   make([]matrixModels.RoleInfo, 0, len(roles)),
		Modules: make([]matrixModels.ModuleInfo, 0, len(modules)),
	}

	// Build roles info
	for _, role := range roles {
		response.Roles = append(response.Roles, matrixModels.RoleInfo{
			ID:   role.ID.Hex(),
			Name: role.Name,
		})
	}

	// Build modules info with permissions
	for _, module := range modules {
		moduleID := module.ID.Hex()
		moduleInfo := matrixModels.ModuleInfo{
			ID:          moduleID,
			Name:        module.Name,
			Permissions: make([]matrixModels.PermissionInfo, 0),
		}

		// Get permissions for this module
		if perms, ok := moduleToPermissions[moduleID]; ok {
			for _, perm := range perms {
				permID := perm.ID.Hex()
				permInfo := matrixModels.PermissionInfo{
					ID:             permID,
					Key:            perm.Code,
					Name:           perm.Name,
					CheckedRoleIDs: permissionToRoles[permID],
				}

				// Nếu không có role nào được gán, khởi tạo empty array
				if permInfo.CheckedRoleIDs == nil {
					permInfo.CheckedRoleIDs = []string{}
				}

				moduleInfo.Permissions = append(moduleInfo.Permissions, permInfo)
			}
		}

		response.Modules = append(response.Modules, moduleInfo)
	}

	// Xử lý permissions chưa có module (nếu có)
	if unassignedPerms, ok := moduleToPermissions["unassigned"]; ok && len(unassignedPerms) > 0 {
		unassignedModule := matrixModels.ModuleInfo{
			ID:          "unassigned",
			Name:        "Chưa phân loại",
			Permissions: make([]matrixModels.PermissionInfo, 0),
		}

		for _, perm := range unassignedPerms {
			permID := perm.ID.Hex()
			permInfo := matrixModels.PermissionInfo{
				ID:             permID,
				Key:            perm.Code,
				Name:           perm.Name,
				CheckedRoleIDs: permissionToRoles[permID],
			}

			if permInfo.CheckedRoleIDs == nil {
				permInfo.CheckedRoleIDs = []string{}
			}

			unassignedModule.Permissions = append(unassignedModule.Permissions, permInfo)
		}

		response.Modules = append(response.Modules, unassignedModule)
	}

	return response, nil
}
