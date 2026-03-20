package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/permission/models"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

type UpdatePermissionStorage interface {
	FindByID(ctx context.Context, id string) (*models.Permission, error)
	FindByCodeExcludeID(ctx context.Context, code string, excludeID string) (*models.Permission, error)
	FindByNameExcludeID(ctx context.Context, name string, excludeID string) (*models.Permission, error)
	Update(ctx context.Context, id string, data *models.Permission) error
}

type UpdatePermissionBiz struct {
	store UpdatePermissionStorage
}

func NewUpdatePermissionBiz(store UpdatePermissionStorage) *UpdatePermissionBiz {
	return &UpdatePermissionBiz{store: store}
}

func (biz *UpdatePermissionBiz) UpdatePermission(ctx context.Context, id string, req *models.UpdatePermissionRequest) (*models.Permission, error) {
	// Kiểm tra permission có tồn tại không
	existingPermission, err := biz.store.FindByID(ctx, id)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, common.NewFullErrorResponse(
				http.StatusNotFound,
				err,
				"Không tìm thấy permission",
				"permission not found",
				"ErrPermissionNotFound",
			)
		}
		return nil, common.ErrDB(err)
	}

	// Nếu có update code, kiểm tra code mới có trùng với permission khác không
	if req.Code != "" && req.Code != existingPermission.Code {
		duplicatePermission, err := biz.store.FindByCodeExcludeID(ctx, req.Code, id)
		if err != nil && err != mongo.ErrNoDocuments {
			return nil, common.ErrDB(err)
		}
		
		if duplicatePermission != nil {
			return nil, common.NewFullErrorResponse(
				http.StatusConflict,
				nil,
				"Mã permission đã tồn tại",
				"permission code already exists",
				"ErrPermissionCodeExists",
			)
		}
		existingPermission.Code = req.Code
	}

	// Nếu có update name, kiểm tra name mới có trùng với permission khác không
	if req.Name != "" && req.Name != existingPermission.Name {
		duplicatePermission, err := biz.store.FindByNameExcludeID(ctx, req.Name, id)
		if err != nil && err != mongo.ErrNoDocuments {
			return nil, common.ErrDB(err)
		}
		
		if duplicatePermission != nil {
			return nil, common.NewFullErrorResponse(
				http.StatusConflict,
				nil,
				"Tên permission đã tồn tại",
				"permission name already exists",
				"ErrPermissionNameExists",
			)
		}
		existingPermission.Name = req.Name
	}

	// Update description
	if req.Description != "" {
		existingPermission.Description = req.Description
	}

	// Update module_id (cho phép set rỗng)
	existingPermission.ModuleID = req.ModuleID

	// Thực hiện update
	if err := biz.store.Update(ctx, id, existingPermission); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, common.NewFullErrorResponse(
				http.StatusNotFound,
				err,
				"Không tìm thấy permission",
				"permission not found",
				"ErrPermissionNotFound",
			)
		}
		return nil, common.ErrDB(err)
	}

	// Lấy lại permission sau khi update
	updatedPermission, err := biz.store.FindByID(ctx, id)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	return updatedPermission, nil
}
