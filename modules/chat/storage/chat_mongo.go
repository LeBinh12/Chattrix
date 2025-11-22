package storage

import (
	"context"
	"crypto/sha1"
	"my-app/modules/chat/models"
	ModelUser "my-app/modules/user/models"
	"sort"

	"github.com/elastic/go-elasticsearch/v8"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ESChatStore struct {
	client *elasticsearch.Client
}

func NewESChatStore(client *elasticsearch.Client) *ESChatStore {
	return &ESChatStore{client: client}
}

type MongoChatStore struct {
	db *mongo.Database
}

func NewMongoChatStore(db *mongo.Database) *MongoChatStore {
	return &MongoChatStore{db: db}
}

func (s *MongoChatStore) CheckUserExists(ctx context.Context, userID string) (bool, error) {
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return false, err
	}

	filter := bson.M{"_id": oid}
	err = s.db.Collection("users").FindOne(ctx, filter).Err()
	if err == mongo.ErrNoDocuments {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *MongoChatStore) GetUserById(ctx context.Context, userID primitive.ObjectID) (*ModelUser.User, error) {

	filter := bson.M{"_id": userID}
	var user ModelUser.User

	err := s.db.Collection("users").FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return nil, err
	}

	user.Password = ""
	return &user, nil
}

func (s *MongoChatStore) CheckGroupExists(ctx context.Context, groupID string) (bool, error) {
	oid, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		return false, err
	}

	filter := bson.M{"_id": oid}
	err = s.db.Collection("group").FindOne(ctx, filter).Err()
	if err == mongo.ErrNoDocuments {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *MongoChatStore) IsUserInGroup(ctx context.Context, userID, groupID primitive.ObjectID) (bool, error) {
	filter := bson.M{
		"group_id": groupID,
		"user_id":  userID,
		"status":   "active",
	}

	err := s.db.Collection("group_members").FindOne(ctx, filter).Err()
	if err == mongo.ErrNoDocuments {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

// Lấy toàn bộ con trỏ của các user trong cùng 1 cuộc hội thoại

func (s *MongoChatStore) GetByConversation(
	ctx context.Context,
	conversationID primitive.ObjectID,
) ([]*models.ChatSeenStatus, error) {

	cursor, err := s.db.Collection("chat_seen_status").
		Find(ctx, bson.M{
			"conversation_id": conversationID,
		})

	defer cursor.Close(ctx)

	var result []*models.ChatSeenStatus
	if err = cursor.All(ctx, &result); err != nil {
		return nil, err
	}

	return result, nil
}

// ConversationID sẽ luôn giống nhau cho 2 người bất kể ai gửi
// Tạo ID cố định từ 2 ObjectID (A và B)
func GetConversationID(a, b primitive.ObjectID) primitive.ObjectID {
	ids := []string{a.Hex(), b.Hex()}
	sort.Strings(ids) // sắp xếp để đảm bảo thứ tự luôn cố định

	h := sha1.New()
	h.Write([]byte(ids[0] + ids[1]))
	sum := h.Sum(nil)

	// Lấy 12 byte đầu làm ObjectID hợp lệ
	var oid [12]byte
	copy(oid[:], sum[:12])
	return primitive.ObjectID(oid)
}
