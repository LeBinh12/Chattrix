package seeder

import (
	"context"
	"log"
	"math/rand"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func SeedUserRoles(db *mongo.Database) {
	ctx := context.Background()
	userColl := db.Collection("users")
	roleColl := db.Collection("roles")
	urColl := db.Collection("user_roles")

	// 1. Lấy tất cả các Role (chỉ lấy System roles)
	// Sử dụng Code thay vì Name vì Name đã được Việt hóa
	systemRoleCodes := []string{"clinic_admin", "dentist", "receptionist", "assistant", "app.customer"}
	roleIDMap := make(map[string]string)

	cursor, err := roleColl.Find(ctx, bson.M{"code": bson.M{"$in": systemRoleCodes}})
	if err != nil {
		log.Printf("Failed to fetch roles for user role seeding: %v", err)
		return
	}
	defer cursor.Close(ctx)

	var roles []struct {
		ID   primitive.ObjectID `bson:"_id"`
		Code string             `bson:"code"`
	}
	if err = cursor.All(ctx, &roles); err != nil {
		return
	}

	for _, r := range roles {
		roleIDMap[r.Code] = r.ID.Hex()
	}

	// 2. Lấy danh sách users (ngoại trừ superadmin và các admin khác)
	excludedUsers := []string{"superadmin", "steven", "ithelpdesk1", "ithelpdesk2", "ithelpdesk3", "ithelpdesk4", "ithelpdesk5"}
	userCursor, err := userColl.Find(ctx, bson.M{"username": bson.M{"$nin": excludedUsers}})
	if err != nil {
		return
	}
	defer userCursor.Close(ctx)

	var users []struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	if err = userCursor.All(ctx, &users); err != nil {
		return
	}

	// 4. Lấy Seed Group ID
	groupColl := db.Collection("groups")
	var seedGroup struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	err = groupColl.FindOne(ctx, bson.M{"name": "Team Flow Seed Group"}).Decode(&seedGroup)
	seedGroupID := ""
	if err == nil {
		seedGroupID = seedGroup.ID.Hex()
	}

	// 5. Lấy Group Role "Member" ID (Sử dụng code 'member')
	var memberRole struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	_ = roleColl.FindOne(ctx, bson.M{"code": "member"}).Decode(&memberRole)

	// 6. Gán ngẫu nhiên vai trò cho từng user và thêm vào group
	rand.Seed(time.Now().UnixNano())
	gmColl := db.Collection("group_user_roles")
	gurCollGroup := db.Collection("group_user_roles")

	for _, u := range users {
		// --- System Roles ---
		// Kiểm tra bằng ObjectID thay vì string hex để chính xác
		count, _ := urColl.CountDocuments(ctx, bson.M{"user_id": u.ID})
		if count == 0 {
			randomRoleCode := systemRoleCodes[rand.Intn(len(systemRoleCodes))]
			roleIDHex, exists := roleIDMap[randomRoleCode]

			if exists {
				roleOID, _ := primitive.ObjectIDFromHex(roleIDHex)
				if !roleOID.IsZero() {
					_, _ = urColl.InsertOne(ctx, bson.M{
						"user_id":    u.ID,    // Lưu dạng ObjectID
						"role_id":    roleOID, // Lưu dạng ObjectID
						"created_at": time.Now(),
						"updated_at": time.Now(),
						"is_deleted": false,
					})
				}
			}
		}

		// --- Group Membership ---
		if seedGroupID != "" {
			seedGroupOID, _ := primitive.ObjectIDFromHex(seedGroupID)
			// Add to Group Members
			gmCount, _ := gmColl.CountDocuments(ctx, bson.M{"group_id": seedGroupOID, "user_id": u.ID})
			if gmCount == 0 {
				_, _ = gmColl.InsertOne(ctx, bson.M{
					"group_id":   seedGroupOID,
					"user_id":    u.ID,
					"joined_at":  time.Now(),
					"is_deleted": false,
				})
			}

			// Add Group Role (Member)
			if !memberRole.ID.IsZero() {
				gurCount, _ := gurCollGroup.CountDocuments(ctx, bson.M{
					"group_id": seedGroupOID,
					"user_id":  u.ID,
					"role_id":  memberRole.ID,
				})
				if gurCount == 0 {
					_, _ = gurCollGroup.InsertOne(ctx, bson.M{
						"group_id":   seedGroupOID,
						"user_id":    u.ID,
						"role_id":    memberRole.ID,
						"created_at": time.Now(),
						"updated_at": time.Now(),
					})
				}
			}
		}
	}
	log.Printf("Finished seeding roles and group memberships for %d users", len(users))
}
