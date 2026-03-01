package storage

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MongoChatStore) UpdateMessageContent(
	ctx context.Context,
	messageID primitive.ObjectID,
	senderID primitive.ObjectID,
	newContent string,
) error {
	// Chỉ cho phép chỉnh sửa nếu user là người gửi
	filter := bson.M{
		"_id":       messageID,
		"sender_id": senderID,
		// Không cho chỉnh sửa tin nhắn đã thu hồi
		"recalled_at": bson.M{"$exists": false},
	}

	now := time.Now()

	update := bson.M{
		"$set": bson.M{
			"content":   newContent,
			"edited_at": now,
		},
	}

	result, err := s.db.Collection("messages").UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("cannot edit message: not found or not authorized")
	}

	return nil
}
