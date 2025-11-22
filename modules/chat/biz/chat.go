package biz

import (
	"context"
	"errors"
	"log"
	"my-app/modules/chat/models"
	ModelUser "my-app/modules/user/models"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChatStorage interface {
	SaveMessage(ctx context.Context, msg *models.Message) error
	CheckUserExists(ctx context.Context, userID string) (bool, error)
	CheckGroupExists(ctx context.Context, groupID string) (bool, error)
	IsUserInGroup(ctx context.Context, userID, groupID primitive.ObjectID) (bool, error)
	GetUserById(ctx context.Context, userID primitive.ObjectID) (*ModelUser.User, error)
}

type ChatESIndexer interface {
	IndexMessage(ctx context.Context, msg *models.Message, senderName string, senderAvatar string) error
}

type ChatBiz struct {
	store ChatStorage
	es    ChatESIndexer
}

func NewChatBiz(store ChatStorage, es ChatESIndexer) *ChatBiz {
	return &ChatBiz{
		store: store,
		es:    es,
	}
}

func (biz *ChatBiz) HandleMessage(
	ctx context.Context,
	sender string,
	receiver string,
	content string,
	status models.MessageStatus,
	group string,
	types models.MediaType,
	mediaList []models.Media,
	createAt time.Time,
	replyTo models.ReplyMessageMini,
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
	}

	msg.ID = primitive.NewObjectID()

	// kiểm tra sender
	senderExists, err := biz.store.CheckUserExists(ctx, sender)
	if err != nil {
		return nil, err
	}
	if !senderExists {
		return nil, errors.New("không tìm thấy người gửi")
	}

	// kiểm tra receiver (1-1 chat)
	if !receiverID.IsZero() {
		receiverExists, err := biz.store.CheckUserExists(ctx, receiver)
		if err != nil {
			return nil, err
		}
		if !receiverExists {
			return nil, errors.New("không tìm thấy người nhận")
		}
	}

	// kiểm tra group
	if !groupID.IsZero() {
		groupExists, err := biz.store.CheckGroupExists(ctx, group)
		if err != nil {
			return nil, err
		}
		if !groupExists {
			return nil, errors.New("không tìm thấy nhóm")
		}

		inGroup, err := biz.store.IsUserInGroup(ctx, senderID, groupID)
		if err != nil {
			return nil, err
		}
		if !inGroup {
			return nil, errors.New("người gửi không thuộc nhóm")
		}
	}

	// Lưu MongoDB
	if err := biz.store.SaveMessage(ctx, msg); err != nil {
		return nil, err
	}

	// Index Elasticsearch
	if biz.es != nil {
		user, err := biz.store.GetUserById(ctx, senderID)
		if err != nil {
			log.Printf("[ES] Lỗi lấy user name: %v", err)
		} else {
			if err := biz.es.IndexMessage(ctx, msg, user.DisplayName, user.Avatar); err != nil {
				log.Printf("[ES] Lỗi index message: %v", err)
			}
		}
	}

	return msg, nil
}
