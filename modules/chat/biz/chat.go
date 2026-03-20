package biz

import (
	"context"
	"errors"
	"log"
	"my-app/modules/chat/models"
	ModelUser "my-app/modules/user/models"
	"time"

	"sync"

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
	cache sync.Map // [string]bool (exists)
}

func NewChatBiz(store ChatStorage, es ChatESIndexer) *ChatBiz {
	return &ChatBiz{
		store: store,
		es:    es,
	}
}

func (biz *ChatBiz) HandleMessage(
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
		msg.RootMessageID = &pID // Cho đơn giản, Root hiện tại trùng với Parent cấp 1
		msg.ThreadDepth = 1
	}

	msg.ID = message_id

	// 1. Kiểm tra sender (Sử dụng cache)
	cacheKey := "u:" + sender
	if val, ok := biz.cache.Load(cacheKey); ok {
		if !val.(bool) {
			return nil, errors.New("không tìm thấy người gửi")
		}
	} else {
		senderExists, err := biz.store.CheckUserExists(ctx, sender)
		if err != nil {
			return nil, err
		}
		biz.cache.Store(cacheKey, senderExists)
		if !senderExists {
			return nil, errors.New("không tìm thấy người gửi")
		}
	}

	// 2. Kiểm tra receiver (1-1 chat) - Sử dụng cache
	if !receiverID.IsZero() {
		cacheKey := "u:" + receiver
		if val, ok := biz.cache.Load(cacheKey); ok {
			if !val.(bool) {
				return nil, errors.New("không tìm thấy người nhận")
			}
		} else {
			exists, err := biz.store.CheckUserExists(ctx, receiver)
			if err != nil {
				return nil, err
			}
			biz.cache.Store(cacheKey, exists)
			if !exists {
				return nil, errors.New("không tìm thấy người nhận")
			}
		}
	}

	// 3. Kiểm tra group - Sử dụng cache
	if !groupID.IsZero() {
		gCacheKey := "g:" + group
		if val, ok := biz.cache.Load(gCacheKey); ok {
			if !val.(bool) {
				return nil, errors.New("không tìm thấy nhóm")
			}
		} else {
			exists, err := biz.store.CheckGroupExists(ctx, group)
			if err != nil {
				return nil, err
			}
			biz.cache.Store(gCacheKey, exists)
			if !exists {
				return nil, errors.New("không tìm thấy nhóm")
			}
		}

		// Kiểm tra người dùng có trong nhóm không (Sử dụng cache)
		mCacheKey := "m:" + group + ":" + sender
		if val, ok := biz.cache.Load(mCacheKey); ok {
			if !val.(bool) {
				return nil, errors.New("người gửi không thuộc nhóm")
			}
		} else {
			inGroup, err := biz.store.IsUserInGroup(ctx, senderID, groupID)
			if err != nil {
				return nil, err
			}
			biz.cache.Store(mCacheKey, inGroup)
			if !inGroup {
				return nil, errors.New("người gửi không thuộc nhóm")
			}
		}
	}

	// 4. Lưu MongoDB
	if err := biz.store.SaveMessage(ctx, msg); err != nil {
		return nil, err
	}

	// 3. Index Elasticsearch (ASYNCHRONOUS)
	if biz.es != nil {
		go func(m models.Message) {
			// Tạo context mới cho background task
			bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			user, err := biz.store.GetUserById(bgCtx, m.SenderID)
			if err != nil {
				log.Printf("[ES-Async] Lỗi lấy user name: %v", err)
				return
			}
			if err := biz.es.IndexMessage(bgCtx, &m, user.DisplayName, user.Avatar); err != nil {
				log.Printf("[ES-Async] Lỗi index message: %v", err)
			}
		}(*msg)
	}

	return msg, nil
}
