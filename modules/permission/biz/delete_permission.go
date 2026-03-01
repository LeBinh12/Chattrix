package biz

import (
	"context"
	"my-app/common"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

type DeletePermissionStorage interface {
	Delete(ctx context.Context, id string) error
}

type DeletePermissionBiz struct {
	store DeletePermissionStorage
}

func NewDeletePermissionBiz(store DeletePermissionStorage) *DeletePermissionBiz {
	return &DeletePermissionBiz{store: store}
}

func (biz *DeletePermissionBiz) DeletePermission(ctx context.Context, id string) error {
	err := biz.store.Delete(ctx, id)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return common.NewFullErrorResponse(
				http.StatusNotFound,
				err,
				"Không tìm thấy permission",
				"permission not found",
				"ErrPermissionNotFound",
			)
		}
		return common.ErrDB(err)
	}

	return nil
}
