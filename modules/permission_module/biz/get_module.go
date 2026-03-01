package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/permission_module/models"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

type GetModuleStorage interface {
	FindByID(ctx context.Context, id string) (*models.PermissionModule, error)
}

type GetModuleBiz struct {
	store GetModuleStorage
}

func NewGetModuleBiz(store GetModuleStorage) *GetModuleBiz {
	return &GetModuleBiz{store: store}
}

func (biz *GetModuleBiz) GetModuleByID(ctx context.Context, id string) (*models.PermissionModule, error) {
	module, err := biz.store.FindByID(ctx, id)
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

	return module, nil
}
