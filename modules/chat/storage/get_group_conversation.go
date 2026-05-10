package storage

import (
	"context"
	"my-app/modules/chat/models"
	ModelUser "my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *MongoChatStore) getGroupConversations(ctx context.Context, userObjectID primitive.ObjectID, page, limit int, keyword string, filterIDs []primitive.ObjectID) ([]groupTemp, error) {
	groupMemberCollection := s.db.Collection("group_user_roles")

	// Match groups for current user (convert ObjectID to string hex for this collection)
	matchGroupsFilter := bson.M{
		"user_id":    userObjectID.Hex(),
		"is_deleted": bson.M{"$ne": true},
		"role_id":    bson.M{"$ne": ""},
	}

	if len(filterIDs) > 0 {
		groupIDsHex := make([]string, len(filterIDs))
		for i, id := range filterIDs {
			groupIDsHex[i] = id.Hex()
		}
		matchGroupsFilter["group_id"] = bson.M{"$in": groupIDsHex}
	}

	matchGroups := bson.D{{"$match", matchGroupsFilter}}

	lookupGroup := bson.D{{
		"$lookup", bson.M{
			"from": "group",
			"let":  bson.M{"gid": "$group_id"},
			"pipeline": mongo.Pipeline{
				{{"$match", bson.M{"$expr": bson.M{"$eq": []interface{}{"$_id", bson.M{"$toObjectId": "$$gid"}}}}}},
			},
			"as": "group_info",
		}}}

	unwindGroup := bson.D{{"$unwind", "$group_info"}}

	var matchKeyword bson.D
	if keyword != "" {
		matchKeyword = bson.D{{"$match", bson.M{
			"group_info.name": bson.M{"$regex": keyword, "$options": "i"},
		}}}
	}

	// 🔹 Lookup last_seen_message_id
	lookupSeenStatus := bson.D{{
		"$lookup", bson.M{
			"from": "chat_seen_status",
			"let":  bson.M{"groupId": bson.M{"$toObjectId": "$group_id"}, "userId": userObjectID},
			"pipeline": []bson.M{
				{"$match": bson.M{
					"$expr": bson.M{
						"$and": []bson.M{
							{"$eq": []interface{}{"$conversation_id", "$$groupId"}},
							{"$eq": []interface{}{"$user_id", "$$userId"}},
						},
					},
				}},
				{"$limit": 1},
			},
			"as": "seen_status",
		},
	}}

	unwindSeenStatus := bson.D{{"$unwind", bson.M{"path": "$seen_status", "preserveNullAndEmptyArrays": true}}}

	// 🔹 Lookup unread count based on last_seen_message_id
	lookupUnread := bson.D{{
		"$lookup", bson.M{
			"from": "messages",
			"let":  bson.M{"groupId": bson.M{"$toObjectId": "$group_id"}, "lastSeenId": "$seen_status.last_seen_message_id", "joinedAt": "$created_at"},
			"pipeline": []bson.M{
				{"$match": bson.M{
					"$expr": bson.M{
						"$and": []bson.M{
							{"$eq": []interface{}{"$group_id", "$$groupId"}},
							{"$gt": []interface{}{"$_id", bson.M{"$ifNull": []interface{}{"$$lastSeenId", primitive.NilObjectID}}}},
						},
					},
					"deleted_for":       bson.M{"$ne": userObjectID},
					"sender_id":         bson.M{"$ne": userObjectID},
					"type":              bson.M{"$ne": "system"},
					"parent_message_id": bson.M{"$exists": false},
				}},
				{"$count": "count"},
			},
			"as": "unread_messages",
		},
	}}

	addUnreadCount := bson.D{{"$addFields", bson.M{
		"unread_count": bson.M{
			"$cond": bson.A{
				bson.M{"$gt": bson.A{bson.M{"$size": "$unread_messages"}, 0}},
				bson.M{"$arrayElemAt": bson.A{"$unread_messages.count", 0}},
				0,
			},
		},
	}}}

	lookupLastMessage := bson.D{{
		"$lookup", bson.M{
			"from": "messages",
			"let":  bson.M{"groupId": bson.M{"$toObjectId": "$group_id"}},
			"pipeline": []bson.M{
				{"$match": bson.M{
					"$expr":             bson.M{"$eq": []interface{}{"$group_id", "$$groupId"}},
					"deleted_for":       bson.M{"$ne": userObjectID},
					"parent_message_id": bson.M{"$exists": false},
				}},
				{"$sort": bson.M{"created_at": -1}},
				{"$limit": 1},
			},
			"as": "last_message_array",
		},
	}}

	addLastMessageField := bson.D{{
		"$addFields", bson.M{
			"last_message": bson.M{
				"$cond": bson.A{
					bson.M{"$gt": bson.A{bson.M{"$size": "$last_message_array"}, 0}},
					bson.M{"$arrayElemAt": bson.A{"$last_message_array", 0}},
					nil,
				},
			},
			"updated_at": "$created_at",
		},
	}}

	pipeline := mongo.Pipeline{matchGroups, lookupGroup, unwindGroup}
	if keyword != "" {
		pipeline = append(pipeline, matchKeyword)
	}
	pipeline = append(pipeline,
		lookupSeenStatus,
		unwindSeenStatus,
		lookupUnread,
		addUnreadCount,
		lookupLastMessage,
		addLastMessageField,
		bson.D{{"$skip", int64((page - 1) * limit)}},
		bson.D{{"$limit", int64(limit)}},
	)

	cursor, err := groupMemberCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var groups []groupTemp
	if err := cursor.All(ctx, &groups); err != nil {
		return nil, err
	}

	// 🔹 FETCH SEEN STATUS FOR LAST MESSAGES
	for i := range groups {
		if groups[i].LastMessage == nil {
			continue
		}

		lastMsgID := groups[i].LastMessage.ID
		groupID := groups[i].GroupID

		// Fetch seen statuses sorted by updated_at descending
		seenCursor, err := s.db.Collection("chat_seen_status").Find(ctx, bson.M{
			"conversation_id": groupID,
		}, options.Find().SetSort(bson.M{"updated_at": -1}))

		if err == nil {
			var seenStatuses []models.ChatSeenStatus
			if err := seenCursor.All(ctx, &seenStatuses); err == nil {
				var seenUserIDs []primitive.ObjectID
				count := 0
				for _, status := range seenStatuses {
					// User has seen this message if their last_seen_message_id >= lastMsgID
					if status.UserID != groups[i].LastMessage.SenderID && (status.LastSeenMessageID == lastMsgID || status.LastSeenMessageID.Timestamp().After(lastMsgID.Timestamp()) || status.LastSeenMessageID.Hex() == lastMsgID.Hex()) {
						count++
						if len(seenUserIDs) < 6 {
							seenUserIDs = append(seenUserIDs, status.UserID)
						}
					}
				}

				if len(seenUserIDs) > 0 {
					var users []ModelUser.User
					userCursor, err := s.db.Collection("users").Find(ctx, bson.M{"_id": bson.M{"$in": seenUserIDs}})
					if err == nil {
						if err := userCursor.All(ctx, &users); err == nil {
							// Create a map for quick lookup to maintain order
							userMap := make(map[primitive.ObjectID]ModelUser.User)
							for _, u := range users {
								userMap[u.ID] = u
							}

							var seenBy []models.SeenUserInfo
							for _, id := range seenUserIDs {
								if u, ok := userMap[id]; ok {
									seenBy = append(seenBy, models.SeenUserInfo{
										ID:          u.ID,
										DisplayName: u.DisplayName,
										Avatar:      u.Avatar,
									})
								}
							}
							groups[i].SeenBy = seenBy
							groups[i].SeenByCount = count
						}
						userCursor.Close(ctx)
					}
				}
			}
			seenCursor.Close(ctx)
		}
	}

	return groups, nil
}
