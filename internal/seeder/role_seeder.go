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
			Description: "Quản trị viên cấp cao nhất của toàn bộ nền tảng, chịu trách nhiệm vận hành và giám sát toàn hệ thống đa phòng khám.",
		},
		{
			Code:        "clinic_admin",
			Name:        "Quản lý phòng khám",
			Description: "Người quản lý phòng khám, đại diện chính chịu trách nhiệm điều hành hoạt động của một phòng khám cụ thể.",
		},
		{
			Code:        "dentist",
			Name:        "Bác sĩ nha khoa",
			Description: "Bác sĩ nha khoa, người trực tiếp khám và điều trị cho bệnh nhân.",
		},
		{
			Code:        "receptionist",
			Name:        "Lễ tân",
			Description: "Lễ tân, chịu trách nhiệm tiếp đón, hỗ trợ bệnh nhân và phối hợp công việc hành chính tại phòng khám.",
		},
		{
			Code:        "assistant",
			Name:        "Trợ tá nha khoa",
			Description: "Trợ tá nha khoa, hỗ trợ bác sĩ trong các công việc lâm sàng và chăm sóc bệnh nhân.",
		},
		{
			Code:        "app.customer",
			Name:        "Bệnh nhân",
			Description: "Bệnh nhân sử dụng hệ thống để liên lạc, nhận tư vấn và theo dõi quá trình điều trị của bản thân.",
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

	for _, role := range roles {
		// Kiểm tra theo name trước (để tương thích với data cũ)
		filterByName := bson.M{"name": role.Name}
		var existingRole models.Role
		err := collection.FindOne(ctx, filterByName).Decode(&existingRole)

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
			// Role đã tồn tại, cập nhật code nếu thiếu
			if existingRole.Code == "" || existingRole.Code != role.Code {
				update := bson.M{
					"$set": bson.M{
						"code":        role.Code,
						"description": role.Description,
						"updated_at":  time.Now(),
					},
				}
				_, err := collection.UpdateOne(ctx, bson.M{"_id": existingRole.ID}, update)
				if err != nil {
					log.Printf("Failed to update role %s: %v", role.Name, err)
				} else {
					log.Printf("🔄 Updated role: %s with code: %s", role.Name, role.Code)
					existingRole.Code = role.Code
				}
			} else {
				log.Printf("Role %s already exists with correct code, skipping...", role.Name)
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
