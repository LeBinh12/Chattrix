package storage

import (
	"context"
	"my-app/common"
	"my-app/modules/permission/models"
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

// Create - Tạo permission mới
func (s *MongoStore) Create(ctx context.Context, data *models.Permission) error {
	now := time.Now()
	data.CreatedAt = now
	data.UpdatedAt = now
	data.DeletedAt = nil

	result, err := s.db.Collection("permissions").InsertOne(ctx, data)
	if err != nil {
		return err
	}
	data.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// List - Lấy danh sách permission với phân trang và tìm kiếm (theo code hoặc name)
func (s *MongoStore) List(ctx context.Context, paging *common.Paging, search string, moduleID string) ([]models.Permission, error) {
	var permissions []models.Permission

	filter := bson.M{"deleted_at": nil}

	if moduleID != "" {
		filter["module_id"] = moduleID
	}

	// Tìm kiếm theo name hoặc code (case insensitive, partial match)
	if search != "" {
		filter["$or"] = []bson.M{
			{"name": bson.M{"$regex": primitive.Regex{Pattern: search, Options: "i"}}},
			{"code": bson.M{"$regex": primitive.Regex{Pattern: search, Options: "i"}}},
		}
	}

	// Đếm tổng số document
	total, err := s.db.Collection("permissions").CountDocuments(ctx, filter)
	if err != nil {
		return nil, err
	}
	paging.Total = total

	// Tính skip
	skip := int64((paging.Page - 1) * paging.Limit)

	// Options cho phân trang và sort
	opts := options.Find().
		SetSkip(skip).
		SetLimit(int64(paging.Limit)).
		SetSort(bson.D{{Key: "created_at", Value: -1}}) // Sort theo created_at giảm dần

	cursor, err := s.db.Collection("permissions").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &permissions); err != nil {
		return nil, err
	}

	return permissions, nil
}

// FindByID - Tìm permission theo ID (không lấy permission đã xóa)
func (s *MongoStore) FindByID(ctx context.Context, id string) (*models.Permission, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var data models.Permission
	filter := bson.M{
		"_id":        oid,
		"deleted_at": nil,
	}

	err = s.db.Collection("permissions").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// FindByCode - Tìm permission theo code (case insensitive, không lấy permission đã xóa)
func (s *MongoStore) FindByCode(ctx context.Context, code string) (*models.Permission, error) {
	var data models.Permission
	filter := bson.M{
		"code":       bson.M{"$regex": primitive.Regex{Pattern: "^" + code + "$", Options: "i"}},
		"deleted_at": nil,
	}

	err := s.db.Collection("permissions").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// FindByName - Tìm permission theo name (case insensitive, không lấy permission đã xóa)
func (s *MongoStore) FindByName(ctx context.Context, name string) (*models.Permission, error) {
	var data models.Permission
	filter := bson.M{
		"name":       bson.M{"$regex": primitive.Regex{Pattern: "^" + name + "$", Options: "i"}},
		"deleted_at": nil,
	}

	err := s.db.Collection("permissions").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// FindByCodeExcludeID - Tìm permission theo code nhưng loại trừ ID cụ thể (dùng cho update)
func (s *MongoStore) FindByCodeExcludeID(ctx context.Context, code string, excludeID string) (*models.Permission, error) {
	oid, err := primitive.ObjectIDFromHex(excludeID)
	if err != nil {
		return nil, err
	}

	var data models.Permission
	filter := bson.M{
		"code":       bson.M{"$regex": primitive.Regex{Pattern: "^" + code + "$", Options: "i"}},
		"deleted_at": nil,
		"_id":        bson.M{"$ne": oid},
	}

	err = s.db.Collection("permissions").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// FindByNameExcludeID - Tìm permission theo name nhưng loại trừ ID cụ thể (dùng cho update)
func (s *MongoStore) FindByNameExcludeID(ctx context.Context, name string, excludeID string) (*models.Permission, error) {
	oid, err := primitive.ObjectIDFromHex(excludeID)
	if err != nil {
		return nil, err
	}

	var data models.Permission
	filter := bson.M{
		"name":       bson.M{"$regex": primitive.Regex{Pattern: "^" + name + "$", Options: "i"}},
		"deleted_at": nil,
		"_id":        bson.M{"$ne": oid},
	}

	err = s.db.Collection("permissions").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// Update - Cập nhật permission (không update permission đã xóa)
func (s *MongoStore) Update(ctx context.Context, id string, data *models.Permission) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	data.UpdatedAt = time.Now()

	// Chỉ update các field được phép
	update := bson.M{
		"$set": bson.M{
			"code":        data.Code,
			"name":        data.Name,
			"description": data.Description,
			"module_id":   data.ModuleID,
			"updated_at":  data.UpdatedAt,
		},
	}

	filter := bson.M{
		"_id":        oid,
		"deleted_at": nil,
	}

	result, err := s.db.Collection("permissions").UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

// Delete - Xóa vĩnh viễn permission
func (s *MongoStore) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	filter := bson.M{"_id": oid}

	result, err := s.db.Collection("permissions").DeleteOne(ctx, filter)
	if err != nil {
		return err
	}

	if result.DeletedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

// FindByModuleID - Lấy tất cả permissions theo module_id
func (s *MongoStore) FindByModuleID(ctx context.Context, moduleID string) ([]models.Permission, error) {
	var permissions []models.Permission
	filter := bson.M{
		"module_id":  moduleID,
		"deleted_at": nil,
	}

	opts := options.Find().SetSort(bson.D{{Key: "code", Value: 1}})
	cursor, err := s.db.Collection("permissions").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &permissions); err != nil {
		return nil, err
	}

	return permissions, nil
}

// FindByIDs - Lấy permissions theo danh sách IDs
func (s *MongoStore) FindByIDs(ctx context.Context, ids []string) ([]models.Permission, error) {
	var permissions []models.Permission

	objectIDs := make([]primitive.ObjectID, 0, len(ids))
	for _, id := range ids {
		oid, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			continue
		}
		objectIDs = append(objectIDs, oid)
	}

	filter := bson.M{
		"_id":        bson.M{"$in": objectIDs},
		"deleted_at": nil,
	}

	cursor, err := s.db.Collection("permissions").Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &permissions); err != nil {
		return nil, err
	}

	return permissions, nil
}

// ListAllPermissions - Lấy tất cả permissions (không phân trang, dùng cho matrix)
func (s *MongoStore) ListAllPermissions(ctx context.Context) ([]models.Permission, error) {
	var permissions []models.Permission
	filter := bson.M{"deleted_at": nil}

	opts := options.Find().SetSort(bson.D{{Key: "module_id", Value: 1}, {Key: "code", Value: 1}})
	cursor, err := s.db.Collection("permissions").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &permissions); err != nil {
		return nil, err
	}

	return permissions, nil
}

// UpdateModuleID - Cập nhật module_id cho permission (dùng cho migration)
func (s *MongoStore) UpdateModuleID(ctx context.Context, id string, moduleID string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"module_id":  moduleID,
			"updated_at": time.Now(),
		},
	}

	filter := bson.M{"_id": oid}
	result, err := s.db.Collection("permissions").UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}
