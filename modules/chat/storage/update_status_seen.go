package storage

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MongoChatStore) UpdateStatusSeen(ctx context.Context, sender_id, receiver_id, lastSeenMsgID primitive.ObjectID) error {
	filter := bson.M{
		"sender_id":   sender_id,
		"receiver_id": receiver_id,
		"is_read":     false,
		"_id":         bson.M{"$lte": lastSeenMsgID}, // tất cả tin nhắn trước hoặc bằng ID cuối cùng
	}

	update := bson.M{
		"$set": bson.M{
			"status":  models.StatusSeen,
			"is_read": true,
		},
	}

	_, err := s.db.Collection("messages").UpdateMany(ctx, filter, update)
	return err
}
