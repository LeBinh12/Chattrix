package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/permission_module/models"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

type UpdateModuleStorage interface {
	FindByID(ctx context.Context, id string) (*models.PermissionModule, error)
	FindByCodeExcludeID(ctx context.Context, code string, excludeID string) (*models.PermissionModule, error)
	Update(ctx context.Context, id string, data map[string]interface{}) error
}

type UpdateModuleBiz struct {
	store UpdateModuleStorage
}

func NewUpdateModuleBiz(store UpdateModuleStorage) *UpdateModuleBiz {
	return &UpdateModuleBiz{store: store}
}

func (biz *UpdateModuleBiz) UpdateModule(ctx context.Context, id string, req *models.UpdateModuleRequest) (*models.PermissionModule, error) {
	// Kiểm tra module có tồn tại không
	existingModule, err := biz.store.FindByID(ctx, id)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, common.NewFullErrorResponse(
				http.StatusNotFound,
				err,
				"Không tìm thấy module",
				"module not found",
				"ErrModuleNotFound",
			)
		}
		return nil, common.ErrDB(err)
	}

	// Prepare update data
	updateData := make(map[string]interface{})

	// Nếu có update code, kiểm tra code mới có trùng với module khác không
	if req.Code != "" && req.Code != existingModule.Code {
		duplicateModule, err := biz.store.FindByCodeExcludeID(ctx, req.Code, id)
		if err != nil && err != mongo.ErrNoDocuments {
			return nil, common.ErrDB(err)
		}
		
		if duplicateModule != nil {
			return nil, common.NewFullErrorResponse(
				http.StatusConflict,
				nil,
				"Mã module đã tồn tại",
				"module code already exists",
				"ErrModuleCodeExists",
			)
		}
		updateData["code"] = req.Code
	}

	if req.Name != "" {
		updateData["name"] = req.Name
	}

	if req.Description != "" {
		updateData["description"] = req.Description
	}

	if req.DisplayOrder > 0 {
		updateData["display_order"] = req.DisplayOrder
	}

	// Thực hiện update
	if err := biz.store.Update(ctx, id, updateData); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, common.NewFullErrorResponse(
				http.StatusNotFound,
				err,
				"Không tìm thấy module",
				"module not found",
				"ErrModuleNotFound",
			)
		}
		return nil, common.ErrDB(err)
	}

	// Lấy lại module sau khi update
	updatedModule, err := biz.store.FindByID(ctx, id)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	return updatedModule, nil
}
