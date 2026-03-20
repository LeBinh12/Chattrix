package storage

import (
	"context"
	"my-app/modules/role_permission/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type MongoStore struct {
	db *mongo.Database
}

func NewMongoStore(db *mongo.Database) *MongoStore {
	return &MongoStore{db: db}
}

func (s *MongoStore) Create(ctx context.Context, data *models.RolePermission) error {
	result, err := s.db.Collection("role_permissions").InsertOne(ctx, data)
	if err != nil {
		return err
	}
	data.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (s *MongoStore) FindByID(ctx context.Context, id string) (*models.RolePermission, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var data models.RolePermission
	err = s.db.Collection("role_permissions").FindOne(ctx, bson.M{"_id": oid}).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (s *MongoStore) FindByRoleID(ctx context.Context, roleID string) ([]models.RolePermission, error) {
	oid, err := primitive.ObjectIDFromHex(roleID)
	
	filter := bson.M{
		"$or": []bson.M{
			{"role_id": roleID},
		},
	}
	if err == nil {
		filter["$or"] = append(filter["$or"].([]bson.M), bson.M{"role_id": oid})
	}

	var results []models.RolePermission
	cursor, err := s.db.Collection("role_permissions").Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	if err = cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	return results, nil
}

// FindAll - Lấy tất cả role_permissions (dùng cho permission matrix)
func (s *MongoStore) FindAll(ctx context.Context) ([]models.RolePermission, error) {
	var results []models.RolePermission
	cursor, err := s.db.Collection("role_permissions").Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	
	if err = cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	return results, nil
}

// DeleteByRoleID - Xóa tất cả permissions của role (dùng cho replace permissions)
func (s *MongoStore) DeleteByRoleID(ctx context.Context, roleID string) error {
	oid, err := primitive.ObjectIDFromHex(roleID)
	
	filter := bson.M{
		"$or": []bson.M{
			{"role_id": roleID},
		},
	}
	if err == nil {
		filter["$or"] = append(filter["$or"].([]bson.M), bson.M{"role_id": oid})
	}

	_, err = s.db.Collection("role_permissions").DeleteMany(ctx, filter)
	return err
}

// BulkCreate - Tạo nhiều role_permissions cùng lúc
func (s *MongoStore) BulkCreate(ctx context.Context, data []models.RolePermission) error {
	if len(data) == 0 {
		return nil
	}

	docs := make([]interface{}, len(data))
	for i, rp := range data {
		docs[i] = rp
	}

	_, err := s.db.Collection("role_permissions").InsertMany(ctx, docs)
	return err
}

// CheckPermissionExists - Kiểm tra permission có tồn tại cho role không
func (s *MongoStore) CheckPermissionExists(ctx context.Context, roleID string, permissionID string) (bool, error) {
	roleOID, errR := primitive.ObjectIDFromHex(roleID)
	permOID, errP := primitive.ObjectIDFromHex(permissionID)

	roleFilters := []interface{}{roleID}
	if errR == nil {
		roleFilters = append(roleFilters, roleOID)
	}

	permFilters := []interface{}{permissionID}
	if errP == nil {
		permFilters = append(permFilters, permOID)
	}

	filter := bson.M{
		"role_id":       bson.M{"$in": roleFilters},
		"permission_id": bson.M{"$in": permFilters},
	}
	
	count, err := s.db.Collection("role_permissions").CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}
	
	return count > 0, nil
}
