package biz

import (
	"context"
	"my-app/common"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

type DeleteRoleStorage interface {
	Delete(ctx context.Context, id string) error
}

type DeleteRoleBiz struct {
	store DeleteRoleStorage
}

func NewDeleteRoleBiz(store DeleteRoleStorage) *DeleteRoleBiz {
	return &DeleteRoleBiz{store: store}
}

func (biz *DeleteRoleBiz) DeleteRole(ctx context.Context, id string) error {
	err := biz.store.Delete(ctx, id)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return common.NewFullErrorResponse(
				http.StatusNotFound,
				err,
				"Không tìm thấy role",
				"role not found",
				"ErrRoleNotFound",
			)
		}
		return common.ErrDB(err)
	}

	return nil
}
