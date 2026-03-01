package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/role/models"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
)

type CreateRoleStorage interface {
	Create(ctx context.Context, data *models.Role) error
	FindByCode(ctx context.Context, code string) (*models.Role, error)
	FindByName(ctx context.Context, name string) (*models.Role, error)
}

type CreateRoleBiz struct {
	store CreateRoleStorage
}

func NewCreateRoleBiz(store CreateRoleStorage) *CreateRoleBiz {
	return &CreateRoleBiz{store: store}
}

func (biz *CreateRoleBiz) CreateRole(ctx context.Context, req *models.CreateRoleRequest) (*models.Role, error) {
	// Kiểm tra code đã tồn tại chưa (case insensitive)
	existingRole, err := biz.store.FindByCode(ctx, req.Code)
	if err != nil && err != mongo.ErrNoDocuments {
		return nil, common.ErrDB(err)
	}
	
	if existingRole != nil {
		return nil, common.NewFullErrorResponse(
			http.StatusConflict,
			nil,
			"Mã role đã tồn tại",
			"role code already exists",
			"ErrRoleCodeExists",
		)
	}
	
	// Kiểm tra name đã tồn tại chưa (case insensitive)
	existingRole, err = biz.store.FindByName(ctx, req.Name)
	if err != nil && err != mongo.ErrNoDocuments {
		return nil, common.ErrDB(err)
	}
	
	if existingRole != nil {
		return nil, common.NewFullErrorResponse(
			http.StatusConflict,
			nil,
			"Tên role đã tồn tại",
			"role name already exists",
			"ErrRoleNameExists",
		)
	}

	// Tạo role mới
	role := &models.Role{
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
	}

	if err := biz.store.Create(ctx, role); err != nil {
		return nil, common.ErrDB(err)
	}

	return role, nil
}
