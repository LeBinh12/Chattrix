package seeder

import (
	"context"
	"log"
	"time"

	"my-app/modules/permission_module/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func SeedPermissionModules(db *mongo.Database) {
	ctx := context.Background()
	collection := db.Collection("permission_modules")

	// Define clean permission modules
	modules := []models.PermissionModule{
		{Code: "system_admin", Name: "Quản lý Admin", Description: "Truy cập và quản lý trang quản trị", DisplayOrder: 0},
		{Code: "system_user", Name: "Quản lý người dùng", Description: "Quản trị người dùng toàn hệ thống", DisplayOrder: 1},
		{Code: "system_group", Name: "Quản lý nhóm", Description: "Quản trị các nhóm/phòng ban", DisplayOrder: 2},
		{Code: "system_role", Name: "Quản lý vai trò", Description: "Cấu hình vai trò (Roles)", DisplayOrder: 3},
		{Code: "system_permission", Name: "Quản lý quyền hạn", Description: "Danh mục các quyền chi tiết", DisplayOrder: 4},
		{Code: "system_module", Name: "Quản lý chức năng", Description: "Nhóm các chức năng hệ thống", DisplayOrder: 5},
		{Code: "system_matrix", Name: "Ma trận phân quyền", Description: "Phân bổ quyền cho các vai trò", DisplayOrder: 6},
		{Code: "system_settings", Name: "Cấu hình & Nhật ký", Description: "Cài đặt hệ thống và xem Log", DisplayOrder: 7},
		{Code: "group_management", Name: "Quản lý nhóm", Description: "Quản lý nhóm và thành viên trong nhóm", DisplayOrder: 8},
		{Code: "group_content", Name: "Quản lí nội dung nhóm", Description: "Quản trị bài viết, tài liệu trong nhóm", DisplayOrder: 9},
	}

	// Upsert modules
	for _, m := range modules {
		filter := bson.M{"code": m.Code}
		update := bson.M{
			"$setOnInsert": bson.M{"_id": primitive.NewObjectID(), "created_at": time.Now()},
			"$set": bson.M{
				"name":          m.Name,
				"description":   m.Description,
				"display_order": m.DisplayOrder,
				"updated_at":    time.Now(),
				"deleted_at":    nil,
			},
		}

		opts := options.Update().SetUpsert(true)
		_, err := collection.UpdateOne(ctx, filter, update, opts)
		if err != nil {
			log.Printf("Failed to seed module %s: %v", m.Code, err)
		}
	}

	var validCodes []string
	for _, m := range modules {
		validCodes = append(validCodes, m.Code)
	}
	_, _ = collection.DeleteMany(ctx, bson.M{"code": bson.M{"$nin": validCodes}})

	log.Printf("✅ Permission modules synchronized and cleaned.")
}
