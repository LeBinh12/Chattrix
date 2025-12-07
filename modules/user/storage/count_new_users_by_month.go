package storage

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func (s *mongoStore) CountNewUsersByMonth(ctx context.Context) (map[string]int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"month": bson.M{"$month": "$created_at"},
			},
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := s.db.Collection("users").Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}

	// Khởi tạo đầy đủ 12 tháng = 0
	result := map[string]int64{
		"jan": 0, "feb": 0, "mar": 0, "apr": 0, "may": 0, "jun": 0,
		"jul": 0, "aug": 0, "sep": 0, "oct": 0, "nov": 0, "dec": 0,
	}

	monthMap := map[int]string{
		1: "jan", 2: "feb", 3: "mar", 4: "apr", 5: "may", 6: "jun",
		7: "jul", 8: "aug", 9: "sep", 10: "oct", 11: "nov", 12: "dec",
	}

	for cursor.Next(ctx) {
		var item struct {
			ID struct {
				Month int `bson:"month"`
			} `bson:"_id"`
			Count int64 `bson:"count"`
		}

		if err = cursor.Decode(&item); err == nil {
			monthKey := monthMap[item.ID.Month]
			result[monthKey] = item.Count
		}
	}

	return result, nil
}
