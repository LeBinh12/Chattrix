package storage

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *mongoStore) CountAllUsers(ctx context.Context) (int64, error) {
	count, err := s.db.Collection("users").CountDocuments(ctx, bson.M{})
	if err != nil {
		return 0, err
	}
	return count, nil
}
