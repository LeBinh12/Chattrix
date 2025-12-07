package storage

import (
	"context"
	"fmt"
	"my-app/modules/chat/models"
	ModelGroup "my-app/modules/group/models"
	ModelUser "my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *MongoChatStore) GetMessageByID(
	ctx context.Context,
	senderID, receiverID, groupID, messageID primitive.ObjectID,
) ([]models.MessageResponse, error) {

	// --- 1. Lấy tin nhắn chính theo ID ---
	var targetMessage models.Message
	err := s.db.Collection("messages").FindOne(ctx, bson.M{"_id": messageID}).Decode(&targetMessage)
	if err != nil {
		return nil, fmt.Errorf("không tìm thấy tin nhắn: %v", err)
	}

	// --- 2. Xác định filter chung (group hoặc chat riêng) ---
	var baseFilter bson.M

	if groupID != primitive.NilObjectID {
		// Kiểm tra user có phải member không
		var member ModelGroup.GroupMember
		err := s.db.Collection("group_members").FindOne(ctx, bson.M{
			"group_id": groupID,
			"user_id":  senderID,
		}).Decode(&member)
		if err != nil {
			return nil, fmt.Errorf("bạn không phải thành viên của nhóm này")
		}

		// Kiểm tra xem target message có thuộc nhóm này không
		if targetMessage.GroupID != groupID {
			return nil, fmt.Errorf("tin nhắn không thuộc nhóm này")
		}

		// Kiểm tra tin nhắn có được tạo sau khi user join không
		if targetMessage.CreatedAt.Before(member.JoinedAt) {
			return nil, fmt.Errorf("tin nhắn được tạo trước khi bạn tham gia nhóm")
		}

		baseFilter = bson.M{
			"group_id":    groupID,
			"created_at":  bson.M{"$gte": member.JoinedAt},
			"deleted_for": bson.M{"$ne": senderID},
		}
	} else {
		// Kiểm tra target message có liên quan đến sender không
		if targetMessage.SenderID != senderID && targetMessage.ReceiverID != senderID {
			return nil, fmt.Errorf("tin nhắn không liên quan đến bạn")
		}

		// Kiểm tra xem có đúng conversation không
		isValidConversation := (targetMessage.SenderID == senderID && targetMessage.ReceiverID == receiverID) ||
			(targetMessage.SenderID == receiverID && targetMessage.ReceiverID == senderID)

		if !isValidConversation {
			return nil, fmt.Errorf("tin nhắn không thuộc cuộc hội thoại này")
		}

		baseFilter = bson.M{
			"$or": []bson.M{
				{"sender_id": senderID, "receiver_id": receiverID},
				{"sender_id": receiverID, "receiver_id": senderID},
			},
			"deleted_for": bson.M{"$ne": senderID},
		}
	}

	// Kiểm tra target message có bị deleted_for không
	for _, deletedUserID := range targetMessage.DeletedFor {
		if deletedUserID == senderID {
			return nil, fmt.Errorf("tin nhắn đã bị xóa")
		}
	}

	// --- 3. Lấy 5 tin nhắn TRƯỚC target message (created_at < target) ---
	filterBefore := bson.M{}
	for k, v := range baseFilter {
		filterBefore[k] = v
	}
	filterBefore["created_at"] = bson.M{"$lt": targetMessage.CreatedAt}

	optsBefore := options.Find().
		SetSort(bson.M{"created_at": -1}).
		SetLimit(5)

	cursorBefore, err := s.db.Collection("messages").Find(ctx, filterBefore, optsBefore)
	if err != nil {
		return nil, err
	}
	defer cursorBefore.Close(ctx)

	var messagesBefore []models.Message
	if err := cursorBefore.All(ctx, &messagesBefore); err != nil {
		return nil, err
	}

	// Đảo ngược để có thứ tự tăng dần
	for i, j := 0, len(messagesBefore)-1; i < j; i, j = i+1, j-1 {
		messagesBefore[i], messagesBefore[j] = messagesBefore[j], messagesBefore[i]
	}

	// --- 4. Lấy 4 tin nhắn SAU target message (created_at > target) ---
	filterAfter := bson.M{}
	for k, v := range baseFilter {
		filterAfter[k] = v
	}
	filterAfter["created_at"] = bson.M{"$gt": targetMessage.CreatedAt}

	optsAfter := options.Find().
		SetSort(bson.M{"created_at": 1}).
		SetLimit(4)

	cursorAfter, err := s.db.Collection("messages").Find(ctx, filterAfter, optsAfter)
	if err != nil {
		return nil, err
	}
	defer cursorAfter.Close(ctx)

	var messagesAfter []models.Message
	if err := cursorAfter.All(ctx, &messagesAfter); err != nil {
		return nil, err
	}

	// --- 5. Ghép: 5 trước + target + 4 sau ---
	allMessages := append(messagesBefore, targetMessage)
	allMessages = append(allMessages, messagesAfter...)

	// --- 6. Lấy danh sách sender_id duy nhất ---
	senderIDsMap := map[primitive.ObjectID]struct{}{}
	for _, msg := range allMessages {
		senderIDsMap[msg.SenderID] = struct{}{}
	}

	var senderIDs []primitive.ObjectID
	for id := range senderIDsMap {
		senderIDs = append(senderIDs, id)
	}

	// --- 7. Query tất cả users ---
	userCursor, err := s.db.Collection("users").Find(ctx, bson.M{"_id": bson.M{"$in": senderIDs}})
	if err != nil {
		return nil, err
	}
	defer userCursor.Close(ctx)

	var users []ModelUser.User
	if err := userCursor.All(ctx, &users); err != nil {
		return nil, err
	}
	userMap := make(map[primitive.ObjectID]ModelUser.User)
	for _, u := range users {
		userMap[u.ID] = u
	}

	// --- 8. Thu thập tất cả mediaIDs ---
	allMediaIDsMap := map[primitive.ObjectID]struct{}{}
	for _, msg := range allMessages {
		for _, mID := range msg.MediaIDs {
			allMediaIDsMap[mID] = struct{}{}
		}
	}

	var allMediaIDs []primitive.ObjectID
	for id := range allMediaIDsMap {
		allMediaIDs = append(allMediaIDs, id)
	}

	// --- 9. Query tất cả medias ---
	mediaMap := map[primitive.ObjectID]models.Media{}
	if len(allMediaIDs) > 0 {
		mediaCursor, err := s.db.Collection("medias").Find(ctx, bson.M{"_id": bson.M{"$in": allMediaIDs}})
		if err == nil {
			defer mediaCursor.Close(ctx)
			var medias []models.Media
			if err := mediaCursor.All(ctx, &medias); err == nil {
				for _, m := range medias {
					mediaMap[m.ID] = m
				}
			}
		}
	}

	// --- 10. Ghép dữ liệu thành MessageResponse ---
	var messageResponses []models.MessageResponse
	for _, msg := range allMessages {
		res := models.MessageResponse{
			ID:         msg.ID,
			SenderID:   msg.SenderID,
			ReceiverID: msg.ReceiverID,
			GroupID:    msg.GroupID,
			Content:    msg.Content,
			CreatedAt:  msg.CreatedAt,
			Status:     msg.Status,
			IsRead:     msg.IsRead,
			Type:       msg.Type,
			RecalledAt: msg.RecalledAt,
			RecalledBy: msg.RecalledBy,
		}

		if user, ok := userMap[msg.SenderID]; ok {
			res.SenderName = user.DisplayName
			res.SenderAvatar = user.Avatar
		} else {
			res.SenderName = "Unknown"
			res.SenderAvatar = "/assets/logo.png"
		}

		// Gán media
		for _, mID := range msg.MediaIDs {
			if m, ok := mediaMap[mID]; ok {
				res.MediaIDs = append(res.MediaIDs, m)
			}
		}

		// Xử lý Reply
		if msg.Reply.ID != primitive.NilObjectID {
			replyUser, ok := userMap[msg.Reply.ID]
			senderName := ""
			if ok {
				senderName = replyUser.DisplayName
			} else {
				senderName = msg.Reply.Sender
			}

			res.Reply = models.ReplyMessageMini{
				ID:       msg.Reply.ID,
				Sender:   senderName,
				Content:  msg.Reply.Content,
				Type:     msg.Reply.Type,
				MediaUrl: msg.Reply.MediaUrl,
			}
		}

		messageResponses = append(messageResponses, res)
	}

	return messageResponses, nil
}

func (s *MongoChatStore) GetMessageOneByID(ctx context.Context, id primitive.ObjectID) (*models.Message, error) {
	var msg models.Message
	err := s.db.Collection("messages").FindOne(ctx, bson.M{"_id": id}).Decode(&msg)
	if err != nil {
		return nil, err
	}
	return &msg, nil
}
