package user

import (
	"context"
	"time"

	dom "my-app/internal/domain/user"
	m "my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type MongoRepository struct {
	db *mongo.Database
}

func NewMongoRepository(db *mongo.Database) *MongoRepository {
	return &MongoRepository{db: db}
}

func (r *MongoRepository) FindByUsername(ctx context.Context, username string) (*dom.User, error) {
	var doc m.User
	filter := bson.M{
		"username":   bson.M{"$regex": "^" + username + "$", "$options": "i"},
		"is_deleted": bson.M{"$ne": true},
	}
	if err := r.db.Collection("users").FindOne(ctx, filter).Decode(&doc); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, dom.ErrUserNotFound
		}
		return nil, err
	}
	u := &dom.User{
		ID:             doc.ID.Hex(),
		Username:       doc.Username,
		Email:          doc.Email,
		Password:       doc.Password,
		IsDeleted:      doc.IsDeleted,
		FailedAttempts: doc.FailedAttempts,
		LockedUntil:    doc.LockedUntil,
	}
	return u, nil
}

func (r *MongoRepository) UpdateLoginMetadata(ctx context.Context, userID string, failedAttempts int, lockedUntil *time.Time) error {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"failed_attempts": failedAttempts,
			"locked_until":    lockedUntil,
		},
	}

	_, err = r.db.Collection("users").UpdateOne(ctx, bson.M{"_id": oid}, update)
	return err
}

func (r *MongoRepository) ResetLoginMetadata(ctx context.Context, userID string) error {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"failed_attempts": 0,
			"locked_until":    nil,
		},
	}

	_, err = r.db.Collection("users").UpdateOne(ctx, bson.M{"_id": oid}, update)
	return err
}

func (r *MongoRepository) GetRoles(ctx context.Context, userID string) ([]string, error) {

	userOID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return []string{}, nil
	}

	// 1. Tìm tất cả role_id của user này trong collection user_roles
	cursor, err := r.db.Collection("user_roles").Find(ctx, bson.M{
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

	// 2. Tìm tên các role tương ứng trong collection roles
	roleCursor, err := r.db.Collection("roles").Find(ctx, bson.M{
		"_id":        bson.M{"$in": roleIDs},
		"is_deleted": bson.M{"$ne": true},
	})
	if err != nil {
		return nil, err
	}
	defer roleCursor.Close(ctx)

	var roles []string
	for roleCursor.Next(ctx) {
		var res struct {
			Code string `bson:"code"`
			Name string `bson:"name"`
		}
		if err := roleCursor.Decode(&res); err != nil {
			continue
		}

		if res.Code != "" {
			roles = append(roles, res.Code)
		} else {

			roles = append(roles, res.Name)
		}
	}

	return roles, nil
}
