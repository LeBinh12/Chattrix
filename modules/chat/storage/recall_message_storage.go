package storage

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MongoChatStore) UpdateMessageRecall(
	ctx context.Context,
	messageID primitive.ObjectID,
	userID primitive.ObjectID,
) error {

	// Chỉ cho phép thu hồi nếu user là người gửi
	filter := bson.M{
		"_id":       messageID,
		"sender_id": userID,
		"recalled_at": bson.M{
			"$exists": false, // Không cho thu hồi lần 2
		},
	}

	now := time.Now()

	update := bson.M{
		"$set": bson.M{
			"recalled_at": now,
			"recalled_by": userID,
			"content":     "", // Option: xoá nội dung để tránh lộ data
		},
	}

	result, err := s.db.Collection("messages").UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return errors.New("cannot recall message")
	}

	return nil
}
