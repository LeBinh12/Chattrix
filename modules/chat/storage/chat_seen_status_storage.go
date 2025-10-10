package storage

import (
	"context"
	"crypto/sha1"
	"my-app/modules/chat/models"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoChatSeenStatus struct {
	db *mongo.Database
}

func NewMongoChatSeenStatusStore(db *mongo.Database) *MongoChatSeenStatus {
	return &MongoChatSeenStatus{db: db}
}

func (s *MongoChatSeenStatus) FindByUserAndConversation(ctx context.Context, userID, conversationID primitive.ObjectID) (*models.ChatSeenStatus, error) {
	var seen models.ChatSeenStatus

	err := s.db.Collection("chat_seen_status").FindOne(ctx, bson.M{
		"user_id":         userID,
		"conversation_id": conversationID,
	}).Decode(&seen)

	if err != nil {
		return nil, nil
	}

	return &seen, nil
}

func (s *MongoChatSeenStatus) CreateOrUpdate(ctx context.Context,
	userID, conversationID, lastSeenMsgID primitive.ObjectID) error {
	filter := bson.M{
		"user_id":         userID,
		"conversation_id": conversationID,
	}

	update := bson.M{
		"$set": bson.M{
			"last_seen_message_id": lastSeenMsgID,
			"updated_at":           time.Now(),
		},
	}

	opts := options.Update().SetUpsert(true)

	_, err := s.db.Collection("chat_seen_status").UpdateOne(ctx, filter, update, opts)

	return err
}

// Lấy toàn bộ con trỏ của các user trong cùng 1 cuộc hội thoại

func (s *MongoChatSeenStatus) GetByConversation(
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

	// Tạo hash
	h := sha1.New()
	h.Write([]byte(ids[0] + ids[1]))
	sum := h.Sum(nil)

	// Lấy 12 byte đầu làm ObjectID hợp lệ
	var oid [12]byte
	copy(oid[:], sum[:12])
	return primitive.ObjectID(oid)
}
