package storage

import (
	"context"
	"fmt"
	"my-app/modules/friend/models"
	modelUser "my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type mongoStore struct {
	db *mongo.Database
}

func NewMongoStore(db *mongo.Database) *mongoStore {
	return &mongoStore{db: db}
}

func (s *mongoStore) GetFriendSuggestions(ctx context.Context, userID string, keyword string, page, limit int) ([]modelUser.User, int64, error) {
	friendCollection := s.db.Collection("friends")
	userCollection := s.db.Collection("users")

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, 0, fmt.Errorf("userID không hợp lệ: %v", err)
	}

	// Lấy hết các friend mà user đã kết bạn

	var friendIDs []primitive.ObjectID
	cursor, err := friendCollection.Find(
		ctx, bson.M{
			"$or": []bson.M{
				{"user_id": userID},
				{"friend_id": userID},
			},
		},
	)
	if err != nil {
		return nil, 0, err
	}

	// nếu ta chưa có bạn bè gì hết thì bỏ qua khúc này
	// nếu ta có bạn bè gì thì add vào 1 danh sách
	for cursor.Next(ctx) {
		var f models.FriendShip
		if err := cursor.Decode(&f); err == nil {
			// các trường FriendID/UserID trong FriendShip là string
			if f.UserID == userID {
				if objID, err := primitive.ObjectIDFromHex(f.FriendID); err == nil {
					friendIDs = append(friendIDs, objID)
				}
			} else {
				if objID, err := primitive.ObjectIDFromHex(f.UserID); err == nil {
					friendIDs = append(friendIDs, objID)
				}
			}
		}
	}

	filter := bson.M{
		"_id": bson.M{"$ne": userObjID}, // loại bỏ chính mình
	}

	if len(friendIDs) > 0 {
		filter["_id"] = bson.M{
			"$nin": append(friendIDs, userObjID), // loại bạn bè + bản thân
		}
	}

	if keyword != "" {
		filter["$or"] = []bson.M{
			{"username": bson.M{"$regex": keyword, "$options": "i"}},
			{"email": bson.M{"$regex": keyword, "$options": "i"}},
			{"full_name": bson.M{"$regex": keyword, "$options": "i"}},
		}
	}

	// tính tổng số
	total, err := userCollection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSkip(int64((page - 1) * limit)).
		SetLimit(int64(limit)).
		SetProjection(bson.M{"password": 0}) // ẩn mật khẩu

	cursorUsers, err := userCollection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursorUsers.Close(ctx)
	fmt.Println("cursorUsers: ", cursorUsers)
	var users []modelUser.User
	if err := cursorUsers.All(ctx, &users); err != nil {
		return nil, 0, err
	}

	return users, total, nil

}
