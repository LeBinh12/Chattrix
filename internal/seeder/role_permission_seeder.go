package seeder

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func SeedRolePermissions(db *mongo.Database) {
	ctx := context.Background()
	roleColl := db.Collection("roles")
	permColl := db.Collection("permissions")
	rpColl := db.Collection("role_permissions")

	// 1. Map Permission Code -> ID
	cursor, _ := permColl.Find(ctx, bson.M{})
	permMap := make(map[string]primitive.ObjectID)
	var allPermIDs []primitive.ObjectID

	for cursor.Next(ctx) {
		var p struct {
			ID   primitive.ObjectID `bson:"_id"`
			Code string             `bson:"code"`
		}
		if err := cursor.Decode(&p); err == nil {
			permMap[p.Code] = p.ID
			allPermIDs = append(allPermIDs, p.ID)
		}
	}

	// 2. Define Matrix
	matrix := map[string][]string{
		"system_admin": {
			"system:user:view_all", "system:user:create", "system:user:update_global", "system:user:delete", "system:user:view_details",
			"system:group:view_all", "system:group:view_details", "system:group:resolve_report", "system:group:change_owner", "system:setting:view", "system:setting:config", "system:moderator:assign",
			"system:content:delete_any", "system:message:delete_any", "system:group:lock",
		},  
		"clinic_admin": {
			"system:user:view_all", "system:user:create", "system:user:view_details",
			"system:group:view_all", "system:group:view_details", "system:group:resolve_report",
			"system:setting:view",
		},
		"dentist": {
			"system:user:view_all", "system:group:view_all", "system:group:view_details",
		},
		"receptionist": {
			"system:user:view_all", "system:user:create", "system:user:view_details",
			"system:group:view_all", "system:group:view_details",
		},
		"assistant": {
			"system:user:view_all", "system:user:view_details",
			"system:group:view_all", "system:group:view_details",
		},
		"owner": {
			"group:settings:edit", "group:info:edit", "group:search:config", "group:dissolve", "group:feature:admin_only", "group:feature:approval_required",
			"group:member:add", "group:member:approve", "group:member:remove", "group:member:ban", "group:member:promote_admin", "group:member:transfer_owner",
			"group:member:view_all", "group:message:send", "group:message:pin", "group:message:unpin", "group:message:delete_any", "group:message:recall_own", "group:message:delete_own",
			"group:message:format", "group:mention:all", "group:message:reply",
			"group:file:upload", "group:file:view_all", "group:poll:create", "group:task:create", "group:task:assign", "group:task:update_status", "group:task:view_all",
			"group:notification:manage", "group:notification:read",
		},
		"admin": {
			"group:info:edit", "group:feature:admin_only",
			"group:member:add", "group:member:approve", "group:member:remove", "group:member:ban",
			"group:member:view_all", "group:message:send", "group:message:pin", "group:message:unpin", "group:message:delete_any", "group:message:recall_own", "group:message:delete_own",
			"group:message:format", "group:mention:all", "group:message:reply",
			"group:file:upload", "group:file:view_all", "group:poll:create", "group:task:create", "group:task:assign", "group:task:update_status", "group:task:view_all",
			"group:notification:read",
		},
		"member": {
			"group:member:view_all", "group:message:send", "group:message:recall_own", "group:message:delete_own", "group:message:reply",
			"group:message:format",
			"group:file:upload", "group:file:view_all", "group:poll:create", "group:task:update_status", "group:task:view_all",
			"group:notification:read",
		},
	}

	// 3. Process seeding
	rolesToProcess := []string{"system_admin"}
	for rCode := range matrix {
		rolesToProcess = append(rolesToProcess, rCode)
	}

	for _, roleCode := range rolesToProcess {
		var role struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		err := roleColl.FindOne(ctx, bson.M{"code": roleCode}).Decode(&role)
		if err != nil {
			continue
		}

		// Xác định quyền của Role
		var targetPermIDs []primitive.ObjectID
		if roleCode == "system_admin" {
			targetPermIDs = allPermIDs
		} else {
			for _, pCode := range matrix[roleCode] {
				if id, ok := permMap[pCode]; ok {
					targetPermIDs = append(targetPermIDs, id)
				}
			}
		}

		// Sync permissions: Xóa những quyền cũ của role và gán lại đầy đủ
		// (Dùng Hard Sync để đảm bảo Database sạch 100%)
		_, _ = rpColl.DeleteMany(ctx, bson.M{"role_id": role.ID})

		for _, pID := range targetPermIDs {
			_, _ = rpColl.InsertOne(ctx, bson.M{
				"role_id":       role.ID,
				"permission_id": pID,
				"created_at":    time.Now(),
				"updated_at":    time.Now(),
			})
		}
		log.Printf("✅ Synced %d permissions for role: %s", len(targetPermIDs), roleCode)
	}
}
