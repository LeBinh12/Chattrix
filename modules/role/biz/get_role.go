package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/role/models"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

type GetRoleStorage interface {
	FindByID(ctx context.Context, id string) (*models.Role, error)
}

type GetRoleBiz struct {
	store GetRoleStorage
}

func NewGetRoleBiz(store GetRoleStorage) *GetRoleBiz {
	return &GetRoleBiz{store: store}
}

func (biz *GetRoleBiz) GetRoleByID(ctx context.Context, id string) (*models.Role, error) {
	role, err := biz.store.FindByID(ctx, id)
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

	return role, nil
}
