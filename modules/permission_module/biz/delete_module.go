package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/permission_module/models"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

type DeleteModuleStorage interface {
	FindByID(ctx context.Context, id string) (*models.PermissionModule, error)
	Delete(ctx context.Context, id string) error
}

type DeleteModuleBiz struct {
	store DeleteModuleStorage
}

func NewDeleteModuleBiz(store DeleteModuleStorage) *DeleteModuleBiz {
	return &DeleteModuleBiz{store: store}
}

func (biz *DeleteModuleBiz) DeleteModule(ctx context.Context, id string) error {
	// Kiểm tra module có tồn tại không
	_, err := biz.store.FindByID(ctx, id)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return common.NewFullErrorResponse(
				http.StatusNotFound,
				err,
				"Không tìm thấy module",
				"module not found",
				"ErrModuleNotFound",
			)
		}
		return common.ErrDB(err)
	}

	// Thực hiện xóa (soft delete)
	if err := biz.store.Delete(ctx, id); err != nil {
		if err == mongo.ErrNoDocuments {
			return common.NewFullErrorResponse(
				http.StatusNotFound,
				err,
				"Không tìm thấy module",
				"module not found",
				"ErrModuleNotFound",
			)
		}
		return common.ErrDB(err)
	}

	return nil
}
