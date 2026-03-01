package biz

import (
	"context"
	"errors"
	"my-app/common"
	"my-app/modules/permission_module/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CreateModuleStorage interface {
	Create(ctx context.Context, data *models.PermissionModule) error
	FindByCode(ctx context.Context, code string) (*models.PermissionModule, error)
}

type CreateModuleBiz struct {
	store CreateModuleStorage
}

func NewCreateModuleBiz(store CreateModuleStorage) *CreateModuleBiz {
	return &CreateModuleBiz{store: store}
}

func (biz *CreateModuleBiz) CreateModule(ctx context.Context, req *models.CreateModuleRequest) (*models.PermissionModule, error) {
	// Kiểm tra code đã tồn tại chưa
	existingModule, err := biz.store.FindByCode(ctx, req.Code)
	if err == nil && existingModule != nil {
		return nil, common.ErrEntityExisted("Module", errors.New("module code already exists"))
	}

	module := &models.PermissionModule{
		MongoModel: common.MongoModel{
			ID: primitive.NewObjectID(),
		},
		Code:         req.Code,
		Name:         req.Name,
		Description:  req.Description,
		DisplayOrder: req.DisplayOrder,
	}

	if err := biz.store.Create(ctx, module); err != nil {
		return nil, common.ErrDB(err)
	}

	return module, nil
}
