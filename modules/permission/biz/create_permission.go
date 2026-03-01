package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/permission/models"
	"net/http"
	"regexp"

	"go.mongodb.org/mongo-driver/mongo"
)

type CreatePermissionStorage interface {
	Create(ctx context.Context, data *models.Permission) error
	FindByCode(ctx context.Context, code string) (*models.Permission, error)
	FindByName(ctx context.Context, name string) (*models.Permission, error)
}

type CreatePermissionBiz struct {
	store CreatePermissionStorage
}

func NewCreatePermissionBiz(store CreatePermissionStorage) *CreatePermissionBiz {
	return &CreatePermissionBiz{store: store}
}

func (biz *CreatePermissionBiz) CreatePermission(ctx context.Context, req *models.CreatePermissionRequest) (*models.Permission, error) {
	// Validate code format: lowercase:colon:notation with underscores allowed
	codeRegex := regexp.MustCompile(`^[a-z]+(\:[a-z_]+)*$`)
	if !codeRegex.MatchString(req.Code) {
		return nil, common.NewFullErrorResponse(
			http.StatusBadRequest,
			nil,
			"Mã permission phải chứa chữ thường, gạch dưới (_), và dấu hai chấm (:) theo dạng: user:create_demo",
			"permission code must contain lowercase letters, underscores (_), and colons (:) in format: user:create_demo",
			"ErrPermissionCodeFormat",
		)
	}

	// Kiểm tra code đã tồn tại chưa (case insensitive)
	existingPermission, err := biz.store.FindByCode(ctx, req.Code)
	if err != nil && err != mongo.ErrNoDocuments {
		return nil, common.ErrDB(err)
	}

	if existingPermission != nil {
		return nil, common.NewFullErrorResponse(
			http.StatusConflict,
			nil,
			"Mã permission đã tồn tại",
			"permission code already exists",
			"ErrPermissionCodeExists",
		)
	}

	// Kiểm tra name đã tồn tại chưa (case insensitive)
	existingPermission, err = biz.store.FindByName(ctx, req.Name)
	if err != nil && err != mongo.ErrNoDocuments {
		return nil, common.ErrDB(err)
	}

	if existingPermission != nil {
		return nil, common.NewFullErrorResponse(
			http.StatusConflict,
			nil,
			"Tên permission đã tồn tại",
			"permission name already exists",
			"ErrPermissionNameExists",
		)
	}

	// Tạo permission mới
	permission := &models.Permission{
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		ModuleID:    req.ModuleID,
	}

	if err := biz.store.Create(ctx, permission); err != nil {
		return nil, common.ErrDB(err)
	}

	return permission, nil
}
