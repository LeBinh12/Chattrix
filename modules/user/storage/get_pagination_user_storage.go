package storage

import (
	"context"
	"my-app/modules/user/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *mongoStore) GetPaginatedUsersWithStatus(ctx context.Context, page, limit int64, search string, gender string, status string, fromDate string, toDate string) ([]models.UserWithStatus, int64, error) {
	collection := s.db.Collection("users")

	matchCondition := bson.M{"is_deleted": bson.M{"$ne": true}}

	// If there is a search query, add it to matchCondition
	if search != "" {
		matchCondition["$or"] = []bson.M{
			{"username": bson.M{"$regex": search, "$options": "i"}},
			{"display_name": bson.M{"$regex": search, "$options": "i"}},
			{"phone": bson.M{"$regex": search, "$options": "i"}},
		}
	}

	if gender != "" && gender != "all" {
		matchCondition["gender"] = gender
	}

	pipeline := mongo.Pipeline{
		// 0. Filter by search and not deleted
		bson.D{{Key: "$match", Value: matchCondition}},

		// 1. Join with user_status
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "user_status",
			"localField":   "_id",
			"foreignField": "user_id",
			"as":           "status_info",
		}}},
		bson.D{{Key: "$unwind", Value: bson.M{"path": "$status_info", "preserveNullAndEmptyArrays": true}}},

		// 1.1 Filter by status (if any) - Need to filter after join because status is in another collection
		bson.D{{Key: "$addFields", Value: bson.M{
			"temp_status":     bson.M{"$ifNull": []interface{}{"$status_info.status", "offline"}},
			"temp_last_login": "$status_info.updated_at",
		}}},
	}

	if status != "" && status != "all" {
		pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.M{"temp_status": status}}})
	}

	// Filter by last login (temp_last_login)
	if fromDate != "" || toDate != "" {
		dateFilter := bson.M{}
		if fromDate != "" {
			if t, err := time.Parse("2006-01-02", fromDate); err == nil {
				dateFilter["$gte"] = t
			}
		}
		if toDate != "" {
			if t, err := time.Parse("2006-01-02", toDate); err == nil {
				// Add 23:59:59 to include the end date
				dateFilter["$lte"] = t.Add(time.Hour*23 + time.Minute*59 + time.Second*59)
			}
		}
		if len(dateFilter) > 0 {
			pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.M{"temp_last_login": dateFilter}}})
		}
	}

	pipeline = append(pipeline,
		// 2. Join with messages to count messages
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "messages",
			"localField":   "_id",
			"foreignField": "sender_id",
			"as":           "messages_info",
		}}},

		// 2.1 Join with user_roles to get role_ids
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "user_roles",
			"localField":   "_id",
			"foreignField": "user_id",
			"as":           "user_roles_info",
		}}},

		// 2.2 Join with roles collection to get role name
		bson.D{{Key: "$lookup", Value: bson.M{
			"from": "roles",
			"let": bson.M{
				"role_ids": bson.M{"$map": bson.M{
					"input": "$user_roles_info",
					"as":    "ur",
					"in":    "$$ur.role_id",
				}},
			},
			"pipeline": []bson.M{
				{"$match": bson.M{
					"$expr":      bson.M{"$in": []interface{}{"$_id", "$$role_ids"}},
					"is_deleted": bson.M{"$ne": true},
				}},
				{"$project": bson.M{
					"name": 1,
					"code": 1,
				}},
			},
			"as": "roles_info",
		}}},

		// 3. Project - KEEP STRUCTURE, do not nest into "user"
		bson.D{{Key: "$project", Value: bson.M{
			"_id":                       1,
			"created_at":                1,
			"updated_at":                1,
			"username":                  1,
			"password":                  1,
			"email":                     1,
			"avatar":                    1,
			"phone":                     1,
			"display_name":              1,
			"birthday":                  1,
			"gender":                    1,
			"is_completed_friend_setup": 1,
			"is_profile_complete":       1,
			"is_deleted":                1,
			"status":                    "$temp_status",
			"last_login":                "$temp_last_login",
			"messages_count":            bson.M{"$size": "$messages_info"},
			"roles": bson.M{
				"$ifNull": []interface{}{
					bson.M{"$map": bson.M{
						"input": "$roles_info",
						"as":    "role",
						"in": bson.M{
							"id":   "$$role._id",
							"code": "$$role.code",
							"name": "$$role.name",
						},
					}},
					[]interface{}{}, // Return empty array if roles_info is null
				},
			},
		}}},

		// 4. Sort online first, newest later
		bson.D{{Key: "$sort", Value: bson.D{
			{Key: "status", Value: -1},
			{Key: "updated_at", Value: -1},
		}}},

		// 5. Pagination
		bson.D{{Key: "$skip", Value: (page - 1) * limit}},
		bson.D{{Key: "$limit", Value: limit}},
	)

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	// Manual Unmarshal
	users := []models.UserWithStatus{}
	for cursor.Next(ctx) {
		var raw bson.M
		if err := cursor.Decode(&raw); err != nil {
			return nil, 0, err
		}

		// Create User object
		var user models.User

		// Map fields to User
		if id, ok := raw["_id"].(primitive.ObjectID); ok {
			user.ID = id
		}
		if createdAt, ok := raw["created_at"].(primitive.DateTime); ok {
			user.CreatedAt = createdAt.Time()
		}
		if updatedAt, ok := raw["updated_at"].(primitive.DateTime); ok {
			user.UpdatedAt = updatedAt.Time()
		}
		if username, ok := raw["username"].(string); ok {
			user.Username = username
		}
		if password, ok := raw["password"].(string); ok {
			user.Password = password
		}
		if email, ok := raw["email"].(string); ok {
			user.Email = email
		}
		if avatar, ok := raw["avatar"].(string); ok {
			user.Avatar = avatar
		}
		if phone, ok := raw["phone"].(string); ok {
			user.Phone = phone
		}
		if displayName, ok := raw["display_name"].(string); ok {
			user.DisplayName = displayName
		}
		if birthday, ok := raw["birthday"].(primitive.DateTime); ok {
			user.Birthday = birthday.Time()
		}
		if gender, ok := raw["gender"].(string); ok {
			user.Gender = gender
		}
		if isCompletedFriendSetup, ok := raw["is_completed_friend_setup"].(bool); ok {
			user.IsCompletedFriendSetup = isCompletedFriendSetup
		}
		if isProfileComplete, ok := raw["is_profile_complete"].(bool); ok {
			user.IsProfileComplete = isProfileComplete
		}
		if isDeleted, ok := raw["is_deleted"].(bool); ok {
			user.IsDeleted = isDeleted
		}

		// Create UserWithStatus object
		userWithStatus := models.UserWithStatus{
			User: user,
		}

		if status, ok := raw["status"].(string); ok {
			userWithStatus.Status = status
		} else {
			userWithStatus.Status = "offline"
		}

		if lastLogin, ok := raw["last_login"].(primitive.DateTime); ok {
			t := lastLogin.Time()
			userWithStatus.LastLogin = &t
		}

		if messagesCount, ok := raw["messages_count"].(int32); ok {
			userWithStatus.MessagesCount = int(messagesCount)
		} else if messagesCount, ok := raw["messages_count"].(int64); ok {
			userWithStatus.MessagesCount = int(messagesCount)
		}

		// Parse roles from roles field
		if rolesInterface, ok := raw["roles"].([]interface{}); ok {
			for _, roleInterface := range rolesInterface {
				if roleMap, ok := roleInterface.(bson.M); ok {
					roleInfo := models.RoleInfo{}
					if id, ok := roleMap["id"].(primitive.ObjectID); ok {
						roleInfo.ID = id.Hex()
					}
					if code, ok := roleMap["code"].(string); ok {
						roleInfo.Code = code
					}
					if name, ok := roleMap["name"].(string); ok {
						roleInfo.Name = name
					}
					userWithStatus.Roles = append(userWithStatus.Roles, roleInfo)
				}
			}
		}

		// Fallback: if aggregation pipeline fails to get roles, call GetUserRoles()
		if len(userWithStatus.Roles) == 0 {
			roleCodes, err := s.GetUserRoles(ctx, user.ID.Hex())
			if err == nil && len(roleCodes) > 0 {
				// Need to fetch role details from DB to have full id, code, name
				roleCursor, err := s.db.Collection("roles").Find(ctx, bson.M{
					"code":       bson.M{"$in": roleCodes},
					"is_deleted": bson.M{"$ne": true},
				})
				if err == nil {
					defer roleCursor.Close(ctx)
					for roleCursor.Next(ctx) {
						var r struct {
							ID   primitive.ObjectID `bson:"_id"`
							Code string             `bson:"code"`
							Name string             `bson:"name"`
						}
						if err := roleCursor.Decode(&r); err != nil {
							continue
						}
						roleInfo := models.RoleInfo{
							ID:   r.ID.Hex(),
							Code: r.Code,
							Name: r.Name,
						}
						userWithStatus.Roles = append(userWithStatus.Roles, roleInfo)
					}
				}
			}
		}

		users = append(users, userWithStatus)
	}

	if err := cursor.Err(); err != nil {
		return nil, 0, err
	}

	// Calculate total users (NEED AGGREGATION because of status join filter)
	countPipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: matchCondition}},
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "user_status",
			"localField":   "_id",
			"foreignField": "user_id",
			"as":           "status_info",
		}}},
		bson.D{{Key: "$unwind", Value: bson.M{"path": "$status_info", "preserveNullAndEmptyArrays": true}}},
		bson.D{{Key: "$addFields", Value: bson.M{
			"temp_status": bson.M{"$ifNull": []interface{}{"$status_info.status", "offline"}},
		}}},
	}

	if status != "" && status != "all" {
		countPipeline = append(countPipeline, bson.D{{Key: "$match", Value: bson.M{"temp_status": status}}})
	}
	countPipeline = append(countPipeline, bson.D{{Key: "$count", Value: "total"}})

	countCursor, err := collection.Aggregate(ctx, countPipeline)
	var total int64 = 0
	if err == nil && countCursor.Next(ctx) {
		var countRes struct {
			Total int64 `bson:"total"`
		}
		if err := countCursor.Decode(&countRes); err == nil {
			total = countRes.Total
		}
		countCursor.Close(ctx)
	}

	return users, total, nil
}

// GetAllUserIDs gets a list of all user _ids (ObjectID) in the system
// Used for broadcast notification to all users
func (s *mongoStore) GetAllUserIDs(ctx context.Context) ([]primitive.ObjectID, error) {
	collection := s.db.Collection("users")

	// Only get _id field to optimize performance
	cursor, err := collection.Find(ctx, bson.M{"is_deleted": bson.M{"$ne": true}}, &options.FindOptions{
		Projection: bson.M{"_id": 1},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var userIDs []primitive.ObjectID
	for cursor.Next(ctx) {
		var result struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, result.ID)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return userIDs, nil
}

func (s *mongoStore) GetAllUserHexIDs(ctx context.Context) ([]string, error) {
	ids, err := s.GetAllUserIDs(ctx)
	if err != nil {
		return nil, err
	}

	hexIDs := make([]string, len(ids))
	for i, id := range ids {
		hexIDs[i] = id.Hex()
	}

	return hexIDs, nil
}
