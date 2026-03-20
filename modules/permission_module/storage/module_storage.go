package storage

import (
	"context"
	"my-app/common"
	"my-app/modules/permission_module/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoStore struct {
	db *mongo.Database
}

func NewMongoStore(db *mongo.Database) *MongoStore {
	return &MongoStore{db: db}
}

// Create - Tạo module mới
func (s *MongoStore) Create(ctx context.Context, data *models.PermissionModule) error {
	now := time.Now()
	data.CreatedAt = now
	data.UpdatedAt = now
	data.DeletedAt = nil

	result, err := s.db.Collection("permission_modules").InsertOne(ctx, data)
	if err != nil {
		return err
	}
	data.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// List - Lấy danh sách module
func (s *MongoStore) List(ctx context.Context, paging *common.Paging, search string) ([]models.PermissionModule, error) {
	var modules []models.PermissionModule

	filter := bson.M{"deleted_at": nil}
	
	if search != "" {
		filter["$or"] = []bson.M{
			{"name": bson.M{"$regex": primitive.Regex{Pattern: search, Options: "i"}}},
			{"code": bson.M{"$regex": primitive.Regex{Pattern: search, Options: "i"}}},
		}
	}

	total, err := s.db.Collection("permission_modules").CountDocuments(ctx, filter)
	if err != nil {
		return nil, err
	}
	paging.Total = total

	skip := int64((paging.Page - 1) * paging.Limit)

	opts := options.Find().
		SetSkip(skip).
		SetLimit(int64(paging.Limit)).
		SetSort(bson.D{{Key: "display_order", Value: 1}, {Key: "created_at", Value: -1}})

	cursor, err := s.db.Collection("permission_modules").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &modules); err != nil {
		return nil, err
	}

	return modules, nil
}

// FindByID - Tìm module theo ID
func (s *MongoStore) FindByID(ctx context.Context, id string) (*models.PermissionModule, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var data models.PermissionModule
	filter := bson.M{
		"_id":        oid,
		"deleted_at": nil,
	}
	
	err = s.db.Collection("permission_modules").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// FindByCode - Tìm module theo code
func (s *MongoStore) FindByCode(ctx context.Context, code string) (*models.PermissionModule, error) {
	var data models.PermissionModule
	filter := bson.M{
		"code":       code,
		"deleted_at": nil,
	}
	
	err := s.db.Collection("permission_modules").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// FindByCodeExcludeID - Tìm module theo code, loại trừ một ID cụ thể (dùng cho update)
func (s *MongoStore) FindByCodeExcludeID(ctx context.Context, code string, excludeID string) (*models.PermissionModule, error) {
	oid, err := primitive.ObjectIDFromHex(excludeID)
	if err != nil {
		return nil, err
	}

	filter := bson.M{
		"code":       bson.M{"$regex": primitive.Regex{Pattern: "^" + code + "$", Options: "i"}},
		"_id":        bson.M{"$ne": oid},
		"deleted_at": nil,
	}

	var module models.PermissionModule
	err = s.db.Collection("permission_modules").FindOne(ctx, filter).Decode(&module)
	if err != nil {
		return nil, err
	}
	return &module, nil
}

// Update - Cập nhật module
func (s *MongoStore) Update(ctx context.Context, id string, data map[string]interface{}) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	data["updated_at"] = time.Now()
	
	update := bson.M{"$set": data}
	filter := bson.M{"_id": oid, "deleted_at": nil}

	result, err := s.db.Collection("permission_modules").UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

// Delete - Xóa mềm module
func (s *MongoStore) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"deleted_at": now,
			"updated_at": now,
		},
	}
	filter := bson.M{"_id": oid, "deleted_at": nil}

	result, err := s.db.Collection("permission_modules").UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

// ListAll - Lấy tất cả module không phân trang (cho migration/seeder)
func (s *MongoStore) ListAll(ctx context.Context) ([]models.PermissionModule, error) {
	var modules []models.PermissionModule

	filter := bson.M{"deleted_at": nil}
	opts := options.Find().SetSort(bson.D{{Key: "display_order", Value: 1}})

	cursor, err := s.db.Collection("permission_modules").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &modules); err != nil {
		return nil, err
	}

	return modules, nil
}
