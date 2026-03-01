package storage

import (
	"context"
	"fmt"
	"my-app/modules/group/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *mongoStoreGroup) CreateGroupNumber(ctx context.Context, data *models.GroupMember) error {
	data.JoinedAt = time.Now()
	// Legacy call or internal struct handling
	// We primarily use group_user_roles via its own storage Upsert now.
	// But let's keep it consistent for internal calls if needed.
	return nil
}

func (s *mongoStoreGroup) RemoveMember(ctx context.Context, groupID, userID primitive.ObjectID) error {
	// Handle soft delete: set is_deleted: true and empty role_id (per user request)
	_, err := s.db.Collection("group_user_roles").UpdateOne(ctx, bson.M{
		"group_id": groupID.Hex(),
		"user_id":  userID.Hex(),
	}, bson.M{
		"$set": bson.M{
			"is_deleted": true,
			"role_id":    "",
			"updated_at": time.Now(),
		},
	})

	// Delete from group_members table (legacy - hard delete)
	_, _ = s.db.Collection("group_members").DeleteOne(ctx, bson.M{
		"group_id": groupID,
		"user_id":  userID,
	})

	return err
}

func (s *mongoStoreGroup) UpdateGroupCreator(ctx context.Context, groupID, newCreatorID primitive.ObjectID) error {
	_, err := s.db.Collection("group").UpdateOne(ctx, bson.M{"_id": groupID}, bson.M{"$set": bson.M{"creator_id": newCreatorID}})
	return err
}

func (s *mongoStoreGroup) UpdateMemberRole(ctx context.Context, groupID, userID primitive.ObjectID, roleCode string) error {
	// 1. Find RoleID by Code
	var role struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	err := s.db.Collection("roles").FindOne(ctx, bson.M{
		"code":       bson.M{"$regex": primitive.Regex{Pattern: "^" + roleCode + "$", Options: "i"}},
		"is_deleted": false,
	}).Decode(&role)

	if err != nil {
		return fmt.Errorf("không tìm thấy role %s: %w", roleCode, err)
	}

	// 2. Update group_user_roles table (Formal RBAC)
	// STRATEGY:
	// - If user is ALREADY active: only update role_id (preserve updated_at to preserve message history).
	// - If user is new or soft-deleted: update role_id, is_deleted=false AND updated_at=now (mark new join milestone).

	activeFilter := bson.M{
		"group_id":   groupID.Hex(),
		"user_id":    userID.Hex(),
		"is_deleted": bson.M{"$ne": true},
	}

	activeUpdate := bson.M{
		"$set": bson.M{
			"role_id": role.ID.Hex(),
		},
	}

	res, err := s.db.Collection("group_user_roles").UpdateOne(ctx, activeFilter, activeUpdate)
	if err != nil {
		return err
	}

	if res.MatchedCount == 0 {
		// User does not exist or has been deleted. Perform Upsert with new updated_at.
		upsertFilter := bson.M{
			"group_id": groupID.Hex(),
			"user_id":  userID.Hex(),
		}
		upsertUpdate := bson.M{
			"$set": bson.M{
				"role_id":    role.ID.Hex(),
				"is_deleted": false,
			},
			"$setOnInsert": bson.M{
				"created_at": time.Now(),
			},
		}
		opts := options.Update().SetUpsert(true)
		_, _ = s.db.Collection("group_user_roles").UpdateOne(ctx, upsertFilter, upsertUpdate, opts)
	}

	// 3. Update at group_members (legacy)
	_, _ = s.db.Collection("group_members").UpdateOne(ctx, bson.M{
		"group_id": groupID,
		"user_id":  userID,
	}, bson.M{"$set": bson.M{"role": roleCode}})

	return nil
}

func (s *mongoStoreGroup) FindMember(ctx context.Context, groupID, userID primitive.ObjectID) (*models.GroupMember, error) {
	// Prioritize searching in group_user_roles
	var gur struct {
		RoleID    string `bson:"role_id"`
		IsDeleted bool   `bson:"is_deleted"`
	}
	err := s.db.Collection("group_user_roles").FindOne(ctx, bson.M{
		"group_id": groupID.Hex(),
		"user_id":  userID.Hex(),
	}).Decode(&gur)

	if err != nil || gur.IsDeleted || gur.RoleID == "" {
		return nil, err
	}

	// If found and active, initialize Member object
	member := &models.GroupMember{
		GroupID: groupID,
		UserID:  userID,
	}

	// Get Role info
	roleOID, err := primitive.ObjectIDFromHex(gur.RoleID)
	if err == nil {
		var role struct {
			ID   primitive.ObjectID `bson:"_id"`
			Code string             `bson:"code"`
			Name string             `bson:"name"`
		}
		err = s.db.Collection("roles").FindOne(ctx, bson.M{"_id": roleOID}).Decode(&role)
		if err == nil {
			member.Role = role.Code

			// Get permissions
			cursor, err := s.db.Collection("role_permissions").Find(ctx, bson.M{"role_id": role.ID})
			if err == nil {
				var rps []struct {
					PermissionID primitive.ObjectID `bson:"permission_id"`
				}
				if err := cursor.All(ctx, &rps); err == nil {
					pIDs := make([]primitive.ObjectID, len(rps))
					for i, rp := range rps {
						pIDs[i] = rp.PermissionID
					}

					pCursor, err := s.db.Collection("permissions").Find(ctx, bson.M{"_id": bson.M{"$in": pIDs}})
					if err == nil {
						var perms []struct {
							Code string `bson:"code"`
						}
						if err := pCursor.All(ctx, &perms); err == nil {
							pCodes := make([]string, len(perms))
							for i, p := range perms {
								pCodes[i] = p.Code
							}

							member.RoleInfo = &models.RoleInfo{
								Code:        role.Code,
								Name:        role.Name,
								Permissions: pCodes,
							}
						}
					}
				}
			}
		}
	}

	return member, nil
}
func (s *mongoStoreGroup) GetNextSuccessor(ctx context.Context, groupID, leavingUserID primitive.ObjectID) (*models.GroupMember, error) {
	groupMemberColl := s.db.Collection("group_user_roles")

	// Pipeline:
	// 1. Match active members of the group, excluding the leaving owner
	// 2. Lookup role code to distinguish between admin and member
	// 3. Sort:
	//    - Priority 1: Role (admin should be first, then member)
	//    - Priority 2: JoinedAt (oldest first)
	// 4. Limit 1

	pipeline := mongo.Pipeline{
		// 1. Filter active group members, skip the one who is leaving
		{{Key: "$match", Value: bson.M{
			"group_id":   groupID.Hex(),
			"user_id":    bson.M{"$ne": leavingUserID.Hex()},
			"is_deleted": bson.M{"$ne": true},
			"role_id":    bson.M{"$ne": ""},
		}}},

		// 2. Lookup role info to get Code
		{{Key: "$lookup", Value: bson.M{
			"from": "roles",
			"let":  bson.M{"rid": "$role_id"},
			"pipeline": mongo.Pipeline{
				{{Key: "$match", Value: bson.M{"$expr": bson.M{"$and": []bson.M{
					{"$eq": []interface{}{"$_id", bson.M{"$toObjectId": "$$rid"}}},
				}}}}},
			},
			"as": "role_info",
		}}},
		{{Key: "$unwind", Value: "$role_info"}},

		// 3. Convert priority for role: Admin (1) > Member (2)
		{{Key: "$addFields", Value: bson.M{
			"role_priority": bson.M{
				"$cond": bson.A{
					bson.M{"$eq": []interface{}{"$role_info.code", "admin"}},
					1,
					2,
				},
			},
		}}},

		// 4. Sort: Prioritize Role first, then whoever joined earlier (joined_at) first
		{{Key: "$sort", Value: bson.D{
			{Key: "role_priority", Value: 1},
			{Key: "joined_at", Value: 1},
		}}},

		// 5. Get the first person
		{{Key: "$limit", Value: 1}},
	}

	cursor, err := groupMemberColl.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		UserID   string `bson:"user_id"`
		RoleInfo struct {
			Code string `bson:"code"`
		} `bson:"role_info"`
	}

	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return nil, nil // No one left to transfer ownership to
	}

	uID, _ := primitive.ObjectIDFromHex(results[0].UserID)

	return &models.GroupMember{
		GroupID: groupID,
		UserID:  uID,
		Role:    results[0].RoleInfo.Code,
	}, nil
}
