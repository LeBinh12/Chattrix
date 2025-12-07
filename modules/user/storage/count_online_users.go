package storage

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *mongoStore) CountOnlineUsers(ctx context.Context) (int64, error) {
	filter := bson.M{"status": "online"}
	count, err := s.db.Collection("user_status").CountDocuments(ctx, filter)
	if err != nil {
		return 0, err
	}
	return count, nil
}
