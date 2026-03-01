package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/role/models"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

type UpdateRoleStorage interface {
	FindByID(ctx context.Context, id string) (*models.Role, error)
	FindByCodeExcludeID(ctx context.Context, code string, excludeID string) (*models.Role, error)
	FindByNameExcludeID(ctx context.Context, name string, excludeID string) (*models.Role, error)
	Update(ctx context.Context, id string, data *models.Role) error
}

type UpdateRoleBiz struct {
	store UpdateRoleStorage
}

func NewUpdateRoleBiz(store UpdateRoleStorage) *UpdateRoleBiz {
	return &UpdateRoleBiz{store: store}
}

func (biz *UpdateRoleBiz) UpdateRole(ctx context.Context, id string, req *models.UpdateRoleRequest) (*models.Role, error) {
	// Kiểm tra role có tồn tại không
	existingRole, err := biz.store.FindByID(ctx, id)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, common.NewFullErrorResponse(
				http.StatusNotFound,
				err,
				"Không tìm thấy role",
				"role not found",
				"ErrRoleNotFound",
			)
		}
		return nil, common.ErrDB(err)
	}

	// Nếu có update code, kiểm tra code mới có trùng với role khác không
	if req.Code != "" && req.Code != existingRole.Code {
		duplicateRole, err := biz.store.FindByCodeExcludeID(ctx, req.Code, id)
		if err != nil && err != mongo.ErrNoDocuments {
			return nil, common.ErrDB(err)
		}
		
		if duplicateRole != nil {
			return nil, common.NewFullErrorResponse(
				http.StatusConflict,
				nil,
				"Mã role đã tồn tại",
				"role code already exists",
				"ErrRoleCodeExists",
			)
		}
		existingRole.Code = req.Code
	}

	// Nếu có update name, kiểm tra name mới có trùng với role khác không
	if req.Name != "" && req.Name != existingRole.Name {
		duplicateRole, err := biz.store.FindByNameExcludeID(ctx, req.Name, id)
		if err != nil && err != mongo.ErrNoDocuments {
			return nil, common.ErrDB(err)
		}
		
		if duplicateRole != nil {
			return nil, common.NewFullErrorResponse(
				http.StatusConflict,
				nil,
				"Tên role đã tồn tại",
				"role name already exists",
				"ErrRoleNameExists",
			)
		}
		existingRole.Name = req.Name
	}

	// Update description
	if req.Description != "" {
		existingRole.Description = req.Description
	}

	// Thực hiện update
	if err := biz.store.Update(ctx, id, existingRole); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, common.NewFullErrorResponse(
				http.StatusNotFound,
				err,
				"Không tìm thấy role",
				"role not found",
				"ErrRoleNotFound",
			)
		}
		return nil, common.ErrDB(err)
	}

	// Lấy lại role sau khi update
	updatedRole, err := biz.store.FindByID(ctx, id)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	return updatedRole, nil
}
