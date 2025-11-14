package statisticalstorage

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func (s *MongoStatisticalStore) CountTodayMessages(ctx context.Context) (int64, error) {
	now := time.Now()
	loc := now.Location()
	collection := s.db.Collection("messages")
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	endOfDay := startOfDay.Add(24 * time.Hour)

	filter := bson.M{
		"created_at": bson.M{
			"$gte": startOfDay,
			"$lt":  endOfDay,
		},
	}

	count, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return 0, err
	}
	return count, nil
}
