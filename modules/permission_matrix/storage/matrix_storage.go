package storage

import (
	"context"
	"my-app/modules/permission/models"
	permissionStorage "my-app/modules/permission/storage"
	moduleModels "my-app/modules/permission_module/models"
	moduleStorage "my-app/modules/permission_module/storage"
	roleModels "my-app/modules/role/models"
	roleStorage "my-app/modules/role/storage"
	rolePermissionModels "my-app/modules/role_permission/models"
	rolePermissionStorage "my-app/modules/role_permission/storage"

	"go.mongodb.org/mongo-driver/mongo"
)

type MatrixStore struct {
	roleStore           *roleStorage.MongoStore
	moduleStore         *moduleStorage.MongoStore
	permissionStore     *permissionStorage.MongoStore
	rolePermissionStore *rolePermissionStorage.MongoStore
}

func NewMatrixStore(db *mongo.Database) *MatrixStore {
	return &MatrixStore{
		roleStore:           roleStorage.NewMongoStore(db),
		moduleStore:         moduleStorage.NewMongoStore(db),
		permissionStore:     permissionStorage.NewMongoStore(db),
		rolePermissionStore: rolePermissionStorage.NewMongoStore(db),
	}
}

func (s *MatrixStore) GetAllRoles(ctx context.Context) ([]roleModels.Role, error) {
	return s.roleStore.ListAllRoles(ctx)
}

func (s *MatrixStore) GetAllModules(ctx context.Context) ([]moduleModels.PermissionModule, error) {
	return s.moduleStore.ListAll(ctx)
}

func (s *MatrixStore) GetAllPermissions(ctx context.Context) ([]models.Permission, error) {
	return s.permissionStore.ListAllPermissions(ctx)
}

func (s *MatrixStore) GetAllRolePermissions(ctx context.Context) ([]rolePermissionModels.RolePermission, error) {
	return s.rolePermissionStore.FindAll(ctx)
}
