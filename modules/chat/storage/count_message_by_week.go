package storage

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MongoChatStore) CountMessageByWeek(ctx context.Context) (map[string]map[string]int64, error) {
	now := time.Now()
	// Lấy thứ 2 đầu tuần
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7 // đổi Chủ Nhật = 7
	}
	startOfWeek := now.AddDate(0, 0, -weekday+1)
	startOfWeek = time.Date(startOfWeek.Year(), startOfWeek.Month(), startOfWeek.Day(), 0, 0, 0, 0, now.Location())

	endOfWeek := startOfWeek.AddDate(0, 0, 7)

	// MATCH điều kiện thời gian
	matchStage := bson.M{
		"$match": bson.M{
			"created_at": bson.M{
				"$gte": startOfWeek,
				"$lt":  endOfWeek,
			},
		},
	}

	// GROUP theo ngày + phân loại cá nhân/nhóm
	groupStage := bson.M{
		"$group": bson.M{
			"_id": bson.M{
				"day":      bson.M{"$dayOfWeek": "$created_at"},
				"is_group": bson.M{"$cond": []interface{}{bson.M{"$ne": []interface{}{"$group_id", primitive.NilObjectID}}, true, false}},
			},
			"count": bson.M{"$sum": 1},
		},
	}

	cursor, err := s.db.Collection("messages").Aggregate(ctx, []bson.M{matchStage, groupStage})
	if err != nil {
		return nil, err
	}

	result := map[string]map[string]int64{
		"personal": {"mon": 0, "tue": 0, "wed": 0, "thu": 0, "fri": 0, "sat": 0, "sun": 0},
		"group":    {"mon": 0, "tue": 0, "wed": 0, "thu": 0, "fri": 0, "sat": 0, "sun": 0},
	}

	weekdayMap := map[int]string{
		2: "mon",
		3: "tue",
		4: "wed",
		5: "thu",
		6: "fri",
		7: "sat",
		1: "sun",
	}

	for cursor.Next(ctx) {
		var item struct {
			ID struct {
				Day     int  `bson:"day"`
				IsGroup bool `bson:"is_group"`
			} `bson:"_id"`
			Count int64 `bson:"count"`
		}

		if err := cursor.Decode(&item); err != nil {
			continue
		}

		day := weekdayMap[item.ID.Day]
		if item.ID.IsGroup {
			result["group"][day] = item.Count
		} else {
			result["personal"][day] = item.Count
		}
	}

	return result, nil
}
