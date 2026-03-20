package biz

import (
	"context"
	"log"
	"my-app/modules/chat/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RawChatBiz - Phiên bản rút gọn của ChatBiz dành cho Kafka Consumer & Load Test
// Không kiểm tra các điều kiện Sender/Receiver/Group tồn tại để tối ưu hiệu suất
// và đảm bảo message không bị drop khi tets (virtual users)
type RawChatBiz struct {
	store ChatStorage
	es    ChatESIndexer
}

func NewRawChatBiz(store ChatStorage, es ChatESIndexer) *RawChatBiz {
	return &RawChatBiz{
		store: store,
		es:    es,
	}
}

func (biz *RawChatBiz) HandleMessage(
	ctx context.Context,
	message_id primitive.ObjectID,
	sender string,
	receiver string,
	content string,
	status models.MessageStatus,
	group string,
	types models.MediaType,
	mediaList []models.Media,
	createAt time.Time,
	replyTo models.ReplyMessageMini,
	task *models.Task,
	parentID string,
) (*models.Message, error) {

	senderID, _ := primitive.ObjectIDFromHex(sender)
	receiverID, _ := primitive.ObjectIDFromHex(receiver)
	groupID, _ := primitive.ObjectIDFromHex(group)

	var mediaIDs []primitive.ObjectID
	for _, m := range mediaList {
		mediaIDs = append(mediaIDs, m.ID)
	}

	msg := &models.Message{
		SenderID:   senderID,
		ReceiverID: receiverID,
		GroupID:    groupID,
		Content:    content,
		CreatedAt:  createAt,
		Status:     status,
		Type:       types,
		IsRead:     false,
		MediaIDs:   mediaIDs,
		Reply:      replyTo,
		Task:       task,
	}

	if parentID != "" {
		pID, _ := primitive.ObjectIDFromHex(parentID)
		msg.ParentMessageID = &pID
		msg.RootMessageID = &pID
		msg.ThreadDepth = 1
	}

	msg.ID = message_id

	// Bỏ qua mọi kiểm tra (UserExists, GroupExists, InGroup)
	// Lưu trực tiếp vào MongoDB
	if err := biz.store.SaveMessage(ctx, msg); err != nil {
		return nil, err
	}

	// Index Elasticsearch (Tương tự h.Hub, check user nếu có, nếu không dùng default)
	if biz.es != nil {
		user, err := biz.store.GetUserById(ctx, senderID)
		var displayName, avatar string
		if err == nil && user != nil {
			displayName = user.DisplayName
			avatar = user.Avatar
		} else {
			displayName = "Virtual User"
			avatar = ""
		}

		if err := biz.es.IndexMessage(ctx, msg, displayName, avatar); err != nil {
			log.Printf("[RawChatBiz] ES Index error: %v", err)
		}
	}

	return msg, nil
}
