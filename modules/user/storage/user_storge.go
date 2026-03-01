package storage

import (
	"context"
	"fmt"
	"my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type mongoStore struct {
	db *mongo.Database
}

func NewMongoStore(db *mongo.Database) *mongoStore {
	return &mongoStore{db: db}

}

func (s *mongoStore) FindByUsername(ctx context.Context, username string) (*models.User, error) {
	var user models.User
	filter := bson.M{
		"username":   bson.M{"$regex": "^" + username + "$", "$options": "i"},
		"is_deleted": bson.M{"$ne": true},
	}
	err := s.db.Collection("users").FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *mongoStore) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	filter := bson.M{
		"email":      bson.M{"$regex": "^" + email + "$", "$options": "i"},
		"is_deleted": bson.M{"$ne": true},
	}
	err := s.db.Collection("users").FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *mongoStore) FindByPhone(ctx context.Context, phone string) (*models.User, error) {
	var user models.User
	filter := bson.M{
		"phone":      phone,
		"is_deleted": bson.M{"$ne": true},
	}
	err := s.db.Collection("users").FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *mongoStore) FindByID(ctx context.Context, id string) (*models.User, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var user models.User
	err = s.db.Collection("users").FindOne(ctx, bson.M{"_id": oid}).Decode(&user)
	if err != nil {
		return nil, err
	}

	user.Password = ""
	return &user, nil
}

func (s *mongoStore) FindUserByID(ctx context.Context, id string) (*models.User, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var user models.User
	err = s.db.Collection("users").FindOne(ctx, bson.M{"_id": oid}).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *mongoStore) GetUserRoles(ctx context.Context, userID string) ([]string, error) {
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return []string{}, nil
	}

	cursor, err := s.db.Collection("user_roles").Find(ctx, bson.M{
		"user_id":    userOID,
		"is_deleted": bson.M{"$ne": true},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var roleIDs []primitive.ObjectID
	for cursor.Next(ctx) {
		var ur struct {
			RoleID primitive.ObjectID `bson:"role_id"`
		}
		if err := cursor.Decode(&ur); err != nil {
			continue
		}
		if !ur.RoleID.IsZero() {
			roleIDs = append(roleIDs, ur.RoleID)
		}
	}

	if len(roleIDs) == 0 {
		return []string{}, nil
	}

	roleCursor, err := s.db.Collection("roles").Find(ctx, bson.M{
		"_id":        bson.M{"$in": roleIDs},
		"is_deleted": bson.M{"$ne": true},
	})
	if err != nil {
		return nil, err
	}
	defer roleCursor.Close(ctx)

	var roles []string
	for roleCursor.Next(ctx) {
		var r struct {
			Code string `bson:"code"`
			Name string `bson:"name"`
		}
		if err := roleCursor.Decode(&r); err != nil {
			continue
		}

		if r.Code != "" {
			roles = append(roles, r.Code)
		} else if r.Name != "" {

			roles = append(roles, r.Name)
		}
	}

	fmt.Printf("✅ [GetUserRoles] FINAL RESULT: %v\n", roles)
	return roles, nil
}

func (s *mongoStore) GetUserPermissions(ctx context.Context, userID string) ([]string, error) {
	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return []string{}, nil
	}

	// Step 1: Get user's roles
	cursor, err := s.db.Collection("user_roles").Find(ctx, bson.M{
		"user_id":    userOID,
		"is_deleted": bson.M{"$ne": true},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var roleIDs []primitive.ObjectID
	for cursor.Next(ctx) {
		var ur struct {
			RoleID primitive.ObjectID `bson:"role_id"`
		}
		if err := cursor.Decode(&ur); err != nil {
			continue
		}
		if !ur.RoleID.IsZero() {
			roleIDs = append(roleIDs, ur.RoleID)
		}
	}

	if len(roleIDs) == 0 {
		return []string{}, nil
	}

	// Step 2: Get permissions for those roles
	permCursor, err := s.db.Collection("role_permissions").Find(ctx, bson.M{
		"role_id": bson.M{"$in": roleIDs},
	})
	if err != nil {
		return nil, err
	}
	defer permCursor.Close(ctx)

	var permissionIDs []primitive.ObjectID
	for permCursor.Next(ctx) {
		var rp struct {
			PermissionID primitive.ObjectID `bson:"permission_id"`
		}
		if err := permCursor.Decode(&rp); err != nil {
			continue
		}
		if !rp.PermissionID.IsZero() {
			permissionIDs = append(permissionIDs, rp.PermissionID)
		}
	}

	if len(permissionIDs) == 0 {
		return []string{}, nil
	}

	// Step 3: Get permission codes
	permDetailCursor, err := s.db.Collection("permissions").Find(ctx, bson.M{
		"_id":        bson.M{"$in": permissionIDs},
		"is_deleted": bson.M{"$ne": true},
	})
	if err != nil {
		return nil, err
	}
	defer permDetailCursor.Close(ctx)

	var permissions []string
	for permDetailCursor.Next(ctx) {
		var p struct {
			Code string `bson:"code"`
		}
		if err := permDetailCursor.Decode(&p); err != nil {
			continue
		}
		if p.Code != "" {
			permissions = append(permissions, p.Code)
		}
	}

	fmt.Printf("✅ [GetUserPermissions] FINAL RESULT: %v\n", permissions)
	return permissions, nil
}
