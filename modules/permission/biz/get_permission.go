package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/permission/models"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

type GetPermissionStorage interface {
	FindByID(ctx context.Context, id string) (*models.Permission, error)
}

type GetPermissionBiz struct {
	store GetPermissionStorage
}

func NewGetPermissionBiz(store GetPermissionStorage) *GetPermissionBiz {
	return &GetPermissionBiz{store: store}
}

func (biz *GetPermissionBiz) GetPermissionByID(ctx context.Context, id string) (*models.Permission, error) {
	permission, err := biz.store.FindByID(ctx, id)
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

	return permission, nil
}
