package storage

import (
	"context"
	"my-app/common"
	"my-app/modules/role/models"
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

// Create - Tạo role mới
func (s *MongoStore) Create(ctx context.Context, data *models.Role) error {
	now := time.Now()
	data.CreatedAt = now
	data.UpdatedAt = now
	data.IsDeleted = false
	data.DeletedAt = nil

	result, err := s.db.Collection("roles").InsertOne(ctx, data)
	if err != nil {
		return err
	}
	data.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// List - Lấy danh sách role với phân trang và tìm kiếm (theo code hoặc name)
func (s *MongoStore) List(ctx context.Context, paging *common.Paging, search string) ([]models.Role, error) {
	var roles []models.Role

	filter := bson.M{"is_deleted": false}

	// Tìm kiếm theo name hoặc code (case insensitive, partial match)
	if search != "" {
		filter["$or"] = []bson.M{
			{"name": bson.M{"$regex": primitive.Regex{Pattern: search, Options: "i"}}},
			{"code": bson.M{"$regex": primitive.Regex{Pattern: search, Options: "i"}}},
		}
	}


	total, err := s.db.Collection("roles").CountDocuments(ctx, filter)
	if err != nil {
		return nil, err
	}
	paging.Total = total


	skip := int64((paging.Page - 1) * paging.Limit)


	opts := options.Find().
		SetSkip(skip).
		SetLimit(int64(paging.Limit)).
		SetSort(bson.D{{Key: "created_at", Value: -1}}) 

	cursor, err := s.db.Collection("roles").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &roles); err != nil {
		return nil, err
	}

	return roles, nil
}

// FindByID - Tìm role theo ID (không lấy role đã xóa)
func (s *MongoStore) FindByID(ctx context.Context, id string) (*models.Role, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var data models.Role
	filter := bson.M{
		"_id":        oid,
		"is_deleted": false,
	}
	
	err = s.db.Collection("roles").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// FindByCode - Tìm role theo code (case insensitive, không lấy role đã xóa)
func (s *MongoStore) FindByCode(ctx context.Context, code string) (*models.Role, error) {
	var data models.Role
	filter := bson.M{
		"code":       bson.M{"$regex": primitive.Regex{Pattern: "^" + code + "$", Options: "i"}},
		"is_deleted": false,
	}
	
	err := s.db.Collection("roles").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// FindByName - Tìm role theo name (case insensitive, không lấy role đã xóa)
func (s *MongoStore) FindByName(ctx context.Context, name string) (*models.Role, error) {
	var data models.Role
	filter := bson.M{
		"name":       bson.M{"$regex": primitive.Regex{Pattern: "^" + name + "$", Options: "i"}},
		"is_deleted": false,
	}
	
	err := s.db.Collection("roles").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}
// FindByCodeExcludeID - Tìm role theo code nhưng loại trừ ID cụ thể (dùng cho update)
func (s *MongoStore) FindByCodeExcludeID(ctx context.Context, code string, excludeID string) (*models.Role, error) {
	oid, err := primitive.ObjectIDFromHex(excludeID)
	if err != nil {
		return nil, err
	}

	var data models.Role
	filter := bson.M{
		"code":       bson.M{"$regex": primitive.Regex{Pattern: "^" + code + "$", Options: "i"}},
		"is_deleted": false,
		"_id":        bson.M{"$ne": oid},
	}
	
	err = s.db.Collection("roles").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}
// FindByNameExcludeID - Tìm role theo name nhưng loại trừ ID cụ thể 
func (s *MongoStore) FindByNameExcludeID(ctx context.Context, name string, excludeID string) (*models.Role, error) {
	oid, err := primitive.ObjectIDFromHex(excludeID)
	if err != nil {
		return nil, err
	}

	var data models.Role
	filter := bson.M{
		"name":       bson.M{"$regex": primitive.Regex{Pattern: "^" + name + "$", Options: "i"}},
		"is_deleted": false,
		"_id":        bson.M{"$ne": oid},
	}
	
	err = s.db.Collection("roles").FindOne(ctx, filter).Decode(&data)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

// Update - Cập nhật role
func (s *MongoStore) Update(ctx context.Context, id string, data *models.Role) error {
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
			"updated_at":  data.UpdatedAt,
		},
	}

	filter := bson.M{
		"_id":        oid,
		"is_deleted": false,
	}

	result, err := s.db.Collection("roles").UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

// Delete - Xóa vĩnh viễn role
func (s *MongoStore) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	filter := bson.M{"_id": oid}
	
	result, err := s.db.Collection("roles").DeleteOne(ctx, filter)
	if err != nil {
		return err
	}

	if result.DeletedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}

// ListAllRoles - Lấy tất cả roles không bị xóa (dùng cho permission matrix)
func (s *MongoStore) ListAllRoles(ctx context.Context) ([]models.Role, error) {
	var roles []models.Role
	filter := bson.M{"is_deleted": false}
	
	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := s.db.Collection("roles").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &roles); err != nil {
		return nil, err
	}

	return roles, nil
}

// FindByIDs - Lấy roles theo danh sách IDs
func (s *MongoStore) FindByIDs(ctx context.Context, ids []string) ([]models.Role, error) {
	var roles []models.Role
	
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
		"is_deleted": false,
	}

	cursor, err := s.db.Collection("roles").Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &roles); err != nil {
		return nil, err
	}

	return roles, nil
}
