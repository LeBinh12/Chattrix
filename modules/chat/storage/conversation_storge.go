package storage

import (
	"context"
	"fmt"
	"log"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type MongoGetConversation struct {
	db *mongo.Database
}

func NewMongoGetConversationStore(db *mongo.Database) *MongoGetConversation {
	return &MongoGetConversation{db: db}
}

// Xử lý lấy hết tất cả, không quan tâm có tin nhắn không
func (s *mongoStore) GetConversations(ctx context.Context, userID string, page, limit int) ([]models.ConversationPreview, int64, error) {
	userCollection := s.db.Collection("users")
	fmt.Println("UserID: ", userID)
	// Lấy hết user trừ mình
	matchUsers := bson.D{{"$match", bson.M{"_id": bson.M{"$ne": convertToObjectID(userID)}}}}

	// Lookup message giữa user hiện tại và người kia
	userObjectID := convertToObjectID(userID)

	lookupMessages := bson.D{{
		"$lookup", bson.M{
			"from": "messages",
			"let":  bson.M{"partnerId": "$_id", "userId": userObjectID},
			"pipeline": []bson.M{
				{
					"$match": bson.M{
						"$expr": bson.M{
							"$or": []bson.M{
								{"$and": []bson.M{
									{"$eq": []interface{}{"$sender_id", "$$userId"}},
									{"$eq": []interface{}{"$receiver_id", "$$partnerId"}},
								}},
								{"$and": []bson.M{
									{"$eq": []interface{}{"$sender_id", "$$partnerId"}},
									{"$eq": []interface{}{"$receiver_id", "$$userId"}},
								}},
							},
						},
					},
				},
				{"$sort": bson.M{"created_at": -1}},
				{"$limit": 1},
			},
			"as": "last_message",
		}},
	}

	// Giải nén tin nhắn cuối cùng
	unwindMsg := bson.D{{"$unwind", bson.M{"path": "$last_message", "preserveNullAndEmptyArrays": true}}}

	// Đếm tin nhắn chưa đọc
	addUnread := bson.D{{
		"$lookup", bson.M{
			"from": "messages",
			"let":  bson.M{"partnerId": "$_id", "userId": userObjectID},
			"pipeline": []bson.M{
				{
					"$match": bson.M{
						"$expr": bson.M{
							"$and": []bson.M{
								{"$eq": []interface{}{"$sender_id", "$$partnerId"}},
								{"$eq": []interface{}{"$receiver_id", "$$userId"}},
								{"$eq": []interface{}{"$is_read", false}},
							},
						},
					},
				},
			},
			"as": "unread_messages",
		}},
	}

	addUnreadCount := bson.D{{
		"$addFields", bson.M{
			"unread_count": bson.M{"$size": "$unread_messages"},
		},
	}}

	// xử lý phân trang
	skipStage := bson.D{{"$skip", int64((page - 1) * limit)}}
	limitStage := bson.D{{"$limit", int64(limit)}}

	cursor, err := userCollection.Aggregate(ctx, mongo.Pipeline{
		matchUsers,
		lookupMessages,
		unwindMsg,
		addUnread,
		addUnreadCount,
		skipStage,
		limitStage,
	})
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	type temp struct {
		ID          primitive.ObjectID     `bson:"_id"`
		DisplayName string                 `bson:"display_name"`
		Avatar      string                 `bson:"avatar"`
		LastMessage *models.MessagePreview `bson:"last_message,omitempty"`
		UnreadCount *int                   `bson:"unread_count,omitempty"`
	}

	var tempResults []temp
	if err := cursor.All(ctx, &tempResults); err != nil {
		return nil, 0, err
	}

	results := make([]models.ConversationPreview, 0)
	for _, u := range tempResults {
		preview := models.ConversationPreview{
			UserID:      u.ID.Hex(),
			DisplayName: u.DisplayName,
			Avatar:      u.Avatar,
		}

		if u.LastMessage != nil {
			preview.LastMessage = u.LastMessage.Content
			if !u.LastMessage.CreatedAt.IsZero() {
				preview.LastDate = u.LastMessage.CreatedAt
			}
		}

		if u.UnreadCount != nil {
			preview.UnreadCount = *u.UnreadCount
		}

		results = append(results, preview)
	}

	total, _ := userCollection.CountDocuments(ctx, bson.M{"_id": bson.M{"$ne": convertToObjectID(userID)}})
	return results, total, nil
}

func convertToObjectID(id string) primitive.ObjectID {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Println("Invalid ObjectID:", err)
	}
	return objID
}

// Xử lý lấy hết tất cả những ai đang nhắn tin

// func (s *mongoStore) GetConversations(ctx context.Context, userID string, page, limit int) ([]models.ConversationPreview, int64, error) {
// 	messageCollection := s.db.Collection("messages")
// 	userCollection := s.db.Collection("users")

// 	// lấy tất cả user đã nhắn tin ra
// 	matchStage := bson.D{
// 		{"$match", bson.M{
// 			"$or": []bson.M{
// 				{"sender_id": userID},
// 				{"receiver_id": userID},
// 			},
// 		}},
// 	}

// 	// lấy tin nhắn cuối cùng của cả 2 người
// 	groupStage := bson.D{
// 		{
// 			"$group", bson.M{
// 				"_id": bson.M{
// 					"$cond": []interface{}{
// 						bson.M{
// 							"$eq": []interface{}{"sender_id", userID}},
// 						"$receiver_id",
// 						"$sender_id",
// 					},
// 				},
// 				"last_message": bson.M{"$last": "content"},
// 				"last_date":    bson.M{"$last": "$created_at"},
// 			},
// 		},
// 	}

// 	sortStage := bson.D{{"$sort", bson.M{"last_date": -1}}}
// 	skipStage := bson.D{{"$skip", int64((page - 1) * limit)}}
// 	limitStage := bson.D{{"$limit", int64(limit)}}

// 	excludeSelfStage := bson.D{
// 		{"$match", bson.M{
// 			"_id": bson.M{"$ne": userID},
// 		}},
// 	}

// 	cursor, err := messageCollection.Aggregate(ctx, mongo.Pipeline{matchStage, groupStage, excludeSelfStage, sortStage, skipStage, limitStage})
// 	if err != nil {
// 		return nil, 0, err
// 	}
// 	defer cursor.Close(ctx)

// 	type tempConv struct {
// 		UserID      string    `bson:"_id"`
// 		LastMessage string    `bson:"last_message"`
// 		LastDate    time.Time `bson:"last_date"`
// 	}

// 	var tempResults []tempConv
// 	if err := cursor.All(ctx, &tempResults); err != nil {
// 		return nil, 0, err
// 	}

// 	// gọp lại với user để lấy avatar
// 	userIDs := make([]string, 0)
// 	for _, t := range tempResults {
// 		userIDs = append(userIDs, t.UserID)
// 	}

// 	filter := bson.M{"_id": bson.M{"$in": convertToObjectIDs(userIDs)}}
// 	userCursor, err := userCollection.Find(ctx, filter)
// 	if err != nil {
// 		return nil, 0, err
// 	}
// 	defer userCursor.Close(ctx)

// 	users := make(map[string]modelUser.User)
// 	for userCursor.Next(ctx) {
// 		var u modelUser.User
// 		if err := userCursor.Decode(&u); err == nil {
// 			users[u.ID.Hex()] = u
// 		}
// 	}

// 	// Đếm số lượng tin nhắn chưa được đọc

// 	results := make([]models.ConversationPreview, 0)
// 	for _, conv := range tempResults {
// 		unreadCount, _ := messageCollection.CountDocuments(ctx, bson.M{
// 			"sender_id":   conv.UserID,
// 			"receiver_id": userID,
// 			"is_read":     false,
// 		})

// 		u := users[conv.UserID]
// 		results = append(results, models.ConversationPreview{
// 			UserID:      conv.UserID,
// 			DisplayName: u.DisplayName,
// 			Avatar:      u.Avatar,
// 			LastMessage: conv.LastMessage,
// 			LastDate:    conv.LastDate,
// 			UnreadCount: int(unreadCount),
// 		})
// 	}

// 	total := int64(len(results))
// 	return results, total, nil
// }

// func convertToObjectIDs(ids []string) []primitive.ObjectID {
// 	result := make([]primitive.ObjectID, 0)
// 	for _, id := range ids {
// 		if objID, err := primitive.ObjectIDFromHex(id); err == nil {
// 			result = append(result, objID)
// 		}
// 	}
// 	return result
// }
