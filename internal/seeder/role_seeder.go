package seeder

import (
	"context"
	"log"
	"my-app/modules/role/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func SeedRoles(db *mongo.Database) {
	ctx := context.Background()
	collection := db.Collection("roles")

	roles := []models.Role{
		// SYSTEM Roles
		{
			Code:        "system_admin",
			Name:        "Quản trị viên hệ thống",
			Description: "Quản trị viên cấp cao nhất của toàn bộ nền tảng, chịu trách nhiệm vận hành và giám sát toàn bộ hệ thống.",
		},
		{
			Code:        "org_admin",
			Name:        "Quản lý cơ quan",
			Description: "Người quản lý cơ quan hoặc đơn vị, chịu trách nhiệm điều hành hoạt động nội bộ của tổ chức.",
		},
		{
			Code:        "department_head",
			Name:        "Trưởng phòng / Trưởng khoa",
			Description: "Trưởng phòng ban hoặc trưởng khoa, chịu trách nhiệm quản lý nhân sự và hoạt động của phòng/khoa trực thuộc.",
		},
		{
			Code:        "teacher",
			Name:        "Giảng viên / Giáo viên",
			Description: "Giảng viên hoặc giáo viên, thực hiện nhiệm vụ giảng dạy và hướng dẫn học tập trong cơ quan/trường.",
		},
		{
			Code:        "staff",
			Name:        "Nhân viên",
			Description: "Nhân viên hành chính hoặc chuyên viên, hỗ trợ các hoạt động vận hành và quản lý trong cơ quan.",
		},
		{
			Code:        "student",
			Name:        "Học sinh / Sinh viên",
			Description: "Học sinh hoặc sinh viên, sử dụng hệ thống để liên lạc, học tập và theo dõi tiến trình học tập.",
		},
		{
			Code:        "user",
			Name:        "Người dùng",
			Description: "Vai trò mặc định khi khởi tạo một tài khoản mới.",
		},
		// GROUP Roles
		{
			Code:        "owner",
			Name:        "Chủ sở hữu nhóm",
			Description: "Chủ sở hữu của một nhóm chat, người tạo và chịu trách nhiệm chính về nhóm đó.",
		},
		{
			Code:        "admin",
			Name:        "Quản lý nhóm",
			Description: "Quản trị viên nhóm (do chủ sở hữu bổ nhiệm), hỗ trợ chủ nhóm trong việc duy trì trật tự và quản lý hoạt động hàng ngày của nhóm.",
		},
		{
			Code:        "member",
			Name:        "Thành viên nhóm",
			Description: "Thành viên thông thường của nhóm, tham gia trao đổi và tương tác trong nhóm.",
		},
	}

	// ====== Dọn dẹp các vai trò cũ không còn phù hợp ======
	obsoleteCodes := []string{"clinic_admin", "dentist", "receptionist", "assistant", "app.customer"}
	for _, code := range obsoleteCodes {
		res, err := collection.DeleteOne(ctx, bson.M{"code": code})
		if err != nil {
			log.Printf("Failed to remove obsolete role (code: %s): %v", code, err)
		} else if res.DeletedCount > 0 {
			log.Printf("🗑️  Removed obsolete role with code: %s", code)
		}
	}

	for _, role := range roles {
		// Kiểm tra theo code (ổn định hơn name)
		filterByCode := bson.M{"code": role.Code}
		var existingRole models.Role
		err := collection.FindOne(ctx, filterByCode).Decode(&existingRole)

		if err == mongo.ErrNoDocuments {
			// Chưa có role này, insert mới
			role.CreatedAt = time.Now()
			role.UpdatedAt = time.Now()
			res, err := collection.InsertOne(ctx, role)
			if err != nil {
				log.Printf("Failed to seed role %s: %v", role.Name, err)
				continue
			}
			role.ID = res.InsertedID.(primitive.ObjectID)
			log.Printf("✅ Seeded role: %s (code: %s)", role.Name, role.Code)
			existingRole = role
		} else if err != nil {
			log.Printf("Error checking role %s: %v", role.Name, err)
			continue
		} else {
			// Role đã tồn tại theo code, cập nhật name + description nếu thay đổi
			if existingRole.Name != role.Name || existingRole.Description != role.Description {
				update := bson.M{
					"$set": bson.M{
						"name":        role.Name,
						"description": role.Description,
						"updated_at":  time.Now(),
					},
				}
				_, err := collection.UpdateOne(ctx, bson.M{"_id": existingRole.ID}, update)
				if err != nil {
					log.Printf("Failed to update role %s: %v", role.Name, err)
				} else {
					log.Printf("🔄 Updated role: %s (code: %s)", role.Name, role.Code)
					existingRole.Name = role.Name
				}
			} else {
				log.Printf("Role %s (code: %s) already up-to-date, skipping...", role.Name, role.Code)
			}
		}

		// Gán Role 'System Admin' cho user 'superadmin' nếu tồn tại

		// Gán Role 'System Admin' cho user 'superadmin' và các user khác
		if existingRole.Code == "system_admin" {
			targetUsers := []string{"superadmin", "steven", "ithelpdesk1", "ithelpdesk2", "ithelpdesk3", "ithelpdesk4", "ithelpdesk5"}

			for _, username := range targetUsers {
				var user struct {
					ID primitive.ObjectID `bson:"_id"`
				}
				err := db.Collection("users").FindOne(ctx, bson.M{"username": username}).Decode(&user)
				if err == nil {
					urCollection := db.Collection("user_roles")
					count, _ := urCollection.CountDocuments(ctx, bson.M{
						"user_id": user.ID,
						"role_id": existingRole.ID,
					})
					if count == 0 {
						_, err := urCollection.InsertOne(ctx, bson.M{
							"user_id":    user.ID,
							"role_id":    existingRole.ID,
							"created_at": time.Now(),
							"updated_at": time.Now(),
							"is_deleted": false,
						})
						if err == nil {
							log.Printf("Assigned 'System Admin' to user '%s'", username)
						}
					}
				}
			}
		}
	}

	seedGroupAndGroupRoles(db)
}

func seedGroupAndGroupRoles(db *mongo.Database) {
	ctx := context.Background()

	var user struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	err := db.Collection("users").FindOne(ctx, bson.M{"username": "superadmin"}).Decode(&user)
	if err != nil {
		log.Printf("Superadmin not found for group seeding")
		return
	}

	groupColl := db.Collection("groups")
	var group struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	err = groupColl.FindOne(ctx, bson.M{"name": "Team Flow Seed Group"}).Decode(&group)
	if err == mongo.ErrNoDocuments {
		res, err := groupColl.InsertOne(ctx, bson.M{
			"name":       "Team Flow Seed Group",
			"creator_id": user.ID,
			"status":     "active",
			"created_at": time.Now(),
			"updated_at": time.Now(),
		})
		if err != nil {
			log.Printf("Failed to create seed group: %v", err)
			return
		}
		group.ID = res.InsertedID.(primitive.ObjectID)
		log.Printf("Created seed group: Team Flow Seed Group")
	}

	groupRoleNames := []string{"Owner", "Admin", "Member"}
	roleIDMap := make(map[string]string)
	for _, name := range groupRoleNames {
		var r struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		err := db.Collection("roles").FindOne(ctx, bson.M{"name": name}).Decode(&r)
		if err == nil {
			roleIDMap[name] = r.ID.Hex()
		}
	}

	gurColl := db.Collection("group_user_roles")
	for name, roleID := range roleIDMap {
		count, _ := gurColl.CountDocuments(ctx, bson.M{
			"group_id": group.ID.Hex(),
			"user_id":  user.ID.Hex(),
			"role_id":  roleID,
		})

		if count == 0 {
			_, err := gurColl.InsertOne(ctx, bson.M{
				"group_id":   group.ID.Hex(),
				"user_id":    user.ID.Hex(),
				"role_id":    roleID,
				"created_at": time.Now(),
				"updated_at": time.Now(),
			})
			if err == nil {
				log.Printf("Seeded group_user_role: %s for user superadmin in seed group", name)
			}
		}
	}
}
