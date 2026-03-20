// xac dinh role của mot tai khoan trong he thong
package storage

import (
	"context"
	"log"
	"my-app/modules/permission/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FindPermissionsByRoleIDs nhận vào danh sách role CODES (từ JWT) và trả về permissions tương ứng
func (s *MongoStore) FindPermissionsByRoleIDs(ctx context.Context, roleCodes []string) ([]models.Permission, error) {
	
	// Bước 1: Chuyển đổi role codes thành role IDs
	roleCursor, err := s.db.Collection("roles").Find(ctx, bson.M{
		"code":       bson.M{"$in": roleCodes},
		"is_deleted": bson.M{"$ne": true},
	})
	if err != nil {
		return nil, err
	}
	defer roleCursor.Close(ctx)

	var roleIDs []primitive.ObjectID
	for roleCursor.Next(ctx) {
		var role struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if err := roleCursor.Decode(&role); err == nil {
			roleIDs = append(roleIDs, role.ID)
		}
	}
	log.Printf("[DEBUG][DB] Stage 1 - Roles to IDs: InputCodes=%v, FoundIDsCount=%d", roleCodes, len(roleIDs))

	if len(roleIDs) == 0 {
		return []models.Permission{}, nil
	}

	// Bước 2: Tìm role_permissions dựa trên role IDs (Hỗ trợ cả String và ObjectID)
	roleIDFilters := make([]interface{}, 0, len(roleIDs)*2)
	for _, rid := range roleIDs {
		roleIDFilters = append(roleIDFilters, rid)
		roleIDFilters = append(roleIDFilters, rid.Hex())
	}

	cursor, err := s.db.Collection("role_permissions").Find(ctx, bson.M{
		"role_id": bson.M{"$in": roleIDFilters},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	permissionIDsMap := make(map[primitive.ObjectID]bool)
	for cursor.Next(ctx) {
		var doc struct {
			PermissionID interface{} `bson:"permission_id"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}

		switch v := doc.PermissionID.(type) {
		case primitive.ObjectID:
			permissionIDsMap[v] = true
		case string:
			if oid, err := primitive.ObjectIDFromHex(v); err == nil {
				permissionIDsMap[oid] = true
			}
		}
	}
	if len(permissionIDsMap) == 0 {
		return []models.Permission{}, nil
	}

	objectIDs := make([]primitive.ObjectID, 0, len(permissionIDsMap))
	for id := range permissionIDsMap {
		objectIDs = append(objectIDs, id)
	}


	var permissions []models.Permission
	
	// Bước 3: Tìm permissions
	cursor, err = s.db.Collection("permissions").Find(ctx, bson.M{
		"_id": bson.M{"$in": objectIDs},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	if err = cursor.All(ctx, &permissions); err != nil {
		return nil, err
	}

	foundCodes := make([]string, len(permissions))
	for i, p := range permissions {
		foundCodes[i] = p.Code
	}

	return permissions, nil
}


func (s *MongoStore) FindPermissionByName(ctx context.Context, name string) (*models.Permission, error) {
	var permission models.Permission
	err := s.db.Collection("permissions").FindOne(ctx, bson.M{
		"name": name,
		// "deleted_at": nil,
	}).Decode(&permission)
	if err != nil {
		return nil, err
	}
	return &permission, nil
}

func (s *MongoStore) FindPermissionByCode(ctx context.Context, code string) (*models.Permission, error) {
	var permission models.Permission
	err := s.db.Collection("permissions").FindOne(ctx, bson.M{
		"code": code,
		// "deleted_at": nil,
	}).Decode(&permission)
	if err != nil {
		return nil, err
	}
	return &permission, nil
}
  