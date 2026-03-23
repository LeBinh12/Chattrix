package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
	BizUser "my-app/modules/user/biz"
	ModelsUser "my-app/modules/user/models"
	StorageUser "my-app/modules/user/storage"
	"strings"

	BizGroup "my-app/modules/group/biz"
	ModelsGroup "my-app/modules/group/models"
	StorageGroup "my-app/modules/group/storage"

	"sync"
	"time"

	"github.com/IBM/sarama"
	"github.com/elastic/go-elasticsearch/v8"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// ======================== FIX #1: Manual commit AFTER insert success ========================
type chatConsumer struct {
	db             *mongo.Database
	es             *elasticsearch.Client
	workerPool     chan struct{}
	batchProcessor *BatchProcessor
	wg             sync.WaitGroup
	commitQueue    chan *commitTask
}

type commitTask struct {
	session sarama.ConsumerGroupSession
	message *sarama.ConsumerMessage
}

// ======================== FIX #3: Batch with synchronous insert + retry ========================
type BatchProcessor struct {
	messages     []messageWithCommit
	mu           sync.Mutex
	maxBatchSize int
	flushTicker  *time.Ticker
	done         chan struct{}
	db           *mongo.Database
	es           *elasticsearch.Client
	commitQueue  chan *commitTask
	processingWg sync.WaitGroup
}

type messageWithCommit struct {
	message  models.MessageResponse
	session  sarama.ConsumerGroupSession
	kafkaMsg *sarama.ConsumerMessage
}

func NewBatchProcessor(db *mongo.Database, es *elasticsearch.Client, batchSize int, commitQueue chan *commitTask) *BatchProcessor {
	bp := &BatchProcessor{
		messages:     make([]messageWithCommit, 0, batchSize),
		maxBatchSize: batchSize,
		flushTicker:  time.NewTicker(2 * time.Second),
		done:         make(chan struct{}),
		db:           db,
		es:           es,
		commitQueue:  commitQueue,
	}

	go bp.autoFlush()
	return bp
}

// ======================== FIX #6: Thread-safe Add ========================
func (bp *BatchProcessor) Add(msg models.MessageResponse, sess sarama.ConsumerGroupSession, kafkaMsg *sarama.ConsumerMessage) {
	bp.mu.Lock()
	defer bp.mu.Unlock()

	bp.messages = append(bp.messages, messageWithCommit{
		message:  msg,
		session:  sess,
		kafkaMsg: kafkaMsg,
	})

	// Flush inside lock to avoid race conditions
	if len(bp.messages) >= bp.maxBatchSize {
		bp.flushLocked() // Flush immediately inside lock
	}
}

func (bp *BatchProcessor) autoFlush() {
	for {
		select {
		case <-bp.flushTicker.C:
			bp.Flush()
		case <-bp.done:
			return
		}
	}
}

func (bp *BatchProcessor) Flush() {
	bp.mu.Lock()
	defer bp.mu.Unlock()
	bp.flushLocked()
}

func (bp *BatchProcessor) flushLocked() {
	if len(bp.messages) == 0 {
		return
	}

	messages := make([]messageWithCommit, len(bp.messages))
	copy(messages, bp.messages)
	bp.messages = bp.messages[:0]

	// Process in a separate goroutine to avoid blocking the lock
	bp.processingWg.Add(1)
	go bp.processBatch(messages)
}

// ======================== FIX #3: Synchronous insert with retry + commit ONLY on success ========================
func (bp *BatchProcessor) processBatch(messages []messageWithCommit) {
	defer bp.processingWg.Done()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Tái sử dụng Store cho toàn bộ batch
	chatStore := storage.NewMongoChatStore(bp.db)
	esChatStore := storage.NewESChatStore(bp.es)
	chatBiz := biz.NewChatBiz(chatStore, esChatStore)

	// Giới hạn số lượng goroutine xử lý đồng thời TRONG một batch (ví dụ: 50)
	// Tránh nổ goroutine khi batch size lớn (1000+)
	semaphore := make(chan struct{}, 50)
	var batchWg sync.WaitGroup

	for _, msgWithCommit := range messages {
		batchWg.Add(1)
		semaphore <- struct{}{} // Acquire

		go func(mwc messageWithCommit) {
			defer batchWg.Done()
			defer func() { <-semaphore }() // Release

			msg := mwc.message

			// Retry logic: max 3 attempts
			var err error
			for retry := 0; retry < 3; retry++ {
				_, err = chatBiz.HandleMessage(ctx,
					msg.ID,
					msg.SenderID.Hex(),
					msg.ReceiverID.Hex(),
					msg.Content,
					msg.Status,
					msg.GroupID.Hex(),
					msg.Type,
					msg.MediaIDs,
					msg.CreatedAt,
					msg.Reply,
					msg.Task,
					msg.ParentID,
				)

				if err == nil {
					bp.commitQueue <- &commitTask{
						session: mwc.session,
						message: mwc.kafkaMsg,
					}
					return
				}

				// Nếu là lỗi logic (không tìm thấy người gửi), không cần retry tốn tài nguyên
				if strings.Contains(err.Error(), "người gửi") || strings.Contains(err.Error(), "không tồn tại") {
					break
				}

				if retry < 2 {
					time.Sleep(time.Duration(retry+1) * 100 * time.Millisecond)
				}
			}

			if err != nil {
				log.Printf(" [Consumer] Failed to insert message %s: %v", msg.ID.Hex(), err)
			}
		}(msgWithCommit)
	}

	batchWg.Wait()
}

func (bp *BatchProcessor) Close() {
	close(bp.done)
	bp.flushTicker.Stop()
	bp.Flush()
	bp.processingWg.Wait() // Wait for all batches to complete
}

// ======================== FIX #1: Manual commit with dedicated goroutine ========================
func StartConsumer(ctx context.Context, brokers []string, groupID string, topics []string, db *mongo.Database, es *elasticsearch.Client) error {
	config := sarama.NewConfig()
	config.Version = sarama.V2_8_0_0
	config.Consumer.Return.Errors = true
	config.Consumer.Group.Rebalance.Strategy = sarama.NewBalanceStrategyRoundRobin()

	// FIX: DISABLE auto-commit
	config.Consumer.Offsets.AutoCommit.Enable = false

	config.ChannelBufferSize = 20000
	config.Consumer.Fetch.Min = 1024 * 1024 * 5
	config.Consumer.Fetch.Default = 1024 * 1024 * 20
	config.Consumer.MaxProcessingTime = 120 * time.Second
	config.Consumer.Group.Session.Timeout = 30 * time.Second
	config.Consumer.Group.Heartbeat.Interval = 10 * time.Second
	config.Consumer.MaxWaitTime = 1000 * time.Millisecond
	config.Consumer.Offsets.Initial = sarama.OffsetNewest

	consumerGroup, err := sarama.NewConsumerGroup(brokers, groupID, config)
	if err != nil {
		return fmt.Errorf("create consumer group: %w", err)
	}
	defer consumerGroup.Close()

	commitQueue := make(chan *commitTask, 1000)
	handler := &chatConsumer{
		db:             db,
		es:             es,
		workerPool:     make(chan struct{}, 200),
		batchProcessor: NewBatchProcessor(db, es, 500, commitQueue),
		commitQueue:    commitQueue,
	}
	// Dedicated commit goroutine
	go handler.commitWorker(ctx)

	log.Println(" Kafka Consumer started with MANUAL commit")

	for {
		if err := consumerGroup.Consume(ctx, topics, handler); err != nil {
			if ctx.Err() != nil {
				handler.Shutdown()
				return ctx.Err()
			}
			log.Printf(" Consumer error: %v", err)
		}

		if ctx.Err() != nil {
			handler.Shutdown()
			return ctx.Err()
		}
	}
}

// ======================== FIX #1: Commit only after successful insert ========================
func (c *chatConsumer) commitWorker(ctx context.Context) {
	commitBatch := make([]*commitTask, 0, 100)
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case task, ok := <-c.commitQueue:
			if !ok {
				return
			}
			commitBatch = append(commitBatch, task)

		case <-ticker.C:
			if len(commitBatch) == 0 {
				continue
			}

			// Commit all messages
			for _, t := range commitBatch {
				t.session.MarkMessage(t.message, "")
			}

			// Commit batch offset
			commitBatch[0].session.Commit()

			commitBatch = commitBatch[:0]

		case <-ctx.Done():
			// Final flush on shutdown
			if len(commitBatch) > 0 {
				for _, t := range commitBatch {
					t.session.MarkMessage(t.message, "")
				}
				commitBatch[0].session.Commit()
				log.Printf(" [Consumer] Final flush: committed %d messages before shutdown", len(commitBatch))
			}
			return
		}
	}
}

func (c *chatConsumer) Setup(_ sarama.ConsumerGroupSession) error {
	log.Println("Consumer group rebalanced - setup")
	return nil
}

func (c *chatConsumer) Cleanup(_ sarama.ConsumerGroupSession) error {
	log.Println("⏳ Consumer group rebalanced - cleanup")
	c.wg.Wait()
	return nil
}

func (c *chatConsumer) ConsumeClaim(sess sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for msg := range claim.Messages() {
		c.workerPool <- struct{}{}
		c.wg.Add(1)

		// FIX: DO NOT commit here anymore
		go c.processMessage(sess, msg)
	}
	return nil
}

func (c *chatConsumer) processMessage(sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	defer func() {
		<-c.workerPool
		c.wg.Done()
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	switch msg.Topic {
	case "chat-topic":
		c.processChatMessage(ctx, sess, msg)
	case "update-status-message":
		c.processUpdateStatus(ctx, sess, msg)
	case "user-status-topic":
		c.processUserStatus(ctx, sess, msg)
	case "group-out":
		c.processGroupOut(ctx, sess, msg)
	case "delete-message-for-me-topic":
		c.processDeleteMessageForMe(ctx, sess, msg)
	case "recall-message-topic":
		c.processRecallMessage(ctx, sess, msg)
	case "pinned-message-topic":
		c.processPinnedMessage(ctx, sess, msg)
	case "un-pinned-message-topic":
		c.processUnPinnedMessage(ctx, sess, msg)
	case "add-group-member":
		c.processGroupMember(ctx, sess, msg)
	case "chat-notification-all":
		c.processNotificationAll(ctx, sess, msg)
	}
}

// processNotificationAll - Send system notification to ALL users
func (c *chatConsumer) processNotificationAll(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var notification models.MessageNotificationResponse
	if err := json.Unmarshal(msg.Value, &notification); err != nil {
		log.Printf("[chat-notification-all] Unmarshal error: %v", err)
		sess.MarkMessage(msg, "")
		return
	}

	// Validate: must be a system notification
	if notification.NotificationType != models.NotificationTypeSystem {
		log.Printf("[chat-notification-all] Not a system notification: %v", notification.NotificationType)
		sess.MarkMessage(msg, "")
		return
	}

	if notification.SenderID.IsZero() {
		log.Printf("[chat-notification-all] Missing SenderID")
		sess.MarkMessage(msg, "")
		return
	}

	// Get sender info (system channel) to get name + avatar
	userStore := StorageUser.NewMongoStore(c.db)
	userBiz := BizUser.NewUserGetPaginationUserBiz(userStore)

	// Get list of all users
	allUserIDs, err := userBiz.GetAllUserIDs(ctx)
	if err != nil {
		log.Printf("[chat-notification-all] Failed to get all user IDs: %v", err)
		sess.MarkMessage(msg, "")
		return
	}

	if len(allUserIDs) == 0 {
		log.Println("[chat-notification-all] No users in system")
		sess.MarkMessage(msg, "")
		return
	}

	log.Printf("[chat-notification-all] Start broadcasting to %d users from channel %s", len(allUserIDs), notification.SenderID.Hex())

	// Create store + biz to save message
	chatStore := storage.NewMongoChatStore(c.db)
	esStore := storage.NewESChatStore(c.es) // can be nil if not needed
	chatBiz := biz.NewChatBiz(chatStore, esStore)

	successCount := 0
	for _, userID := range allUserIDs {
		// Create individual message for each user (1:1 from system channel)
		perUserMsg := &models.MessageResponse{
			ID:           primitive.NewObjectID(),
			SenderID:     notification.SenderID,
			ReceiverID:   userID, // only 1 recipient
			Content:      notification.Content,
			Type:         notification.Type,
			MediaIDs:     notification.MediaIDs,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
			Status:       models.StatusSent, // will become Delivered when user is online
			IsRead:       false,
			SenderName:   notification.SenderName,
			SenderAvatar: notification.SenderAvatar,
			// Other fields if needed
		}

		// Save to DB (HandleMessage handles full logic: save message, update conversation, index ES...)
		_, err := chatBiz.HandleMessage(ctx,
			perUserMsg.ID,
			perUserMsg.SenderID.Hex(),
			perUserMsg.ReceiverID.Hex(),
			perUserMsg.Content,
			perUserMsg.Status,
			"", // empty group_id
			perUserMsg.Type,
			perUserMsg.MediaIDs,
			perUserMsg.CreatedAt,
			models.ReplyMessageMini{}, // zero value – no reply
			&models.Task{},
			"",
		)

		if err != nil {
			log.Printf("[chat-notification-all] Failed to save message for user %s: %v", userID.Hex(), err)
			continue
		}

		successCount++
	}

	log.Printf("[chat-notification-all] Successfully saved messages for %d/%d users", successCount, len(allUserIDs))

	// Commit message gốc từ Kafka
	c.commitQueue <- &commitTask{
		session: sess,
		message: msg,
	}
}

func (c *chatConsumer) processGroupMember(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var payload models.GroupMemberRequest

	if err := json.Unmarshal(msg.Value, &payload); err != nil {
		log.Printf("[group-member] Unmarshal error: %v | payload: %s", err, string(msg.Value))
		sess.MarkMessage(msg, "")
		return
	}

	// Biz / Storage
	groupStore := StorageGroup.NewMongoStoreGroup(c.db)
	groupBiz := BizGroup.CreateGroupMemberStorage(groupStore)
	fmt.Println("add-group-member Kaffka", payload)

	// Iterate through all members
	for _, m := range payload.Members {
		roleCode := m.Role
		if roleCode == "" || roleCode == "member" {
			roleCode = "member" // Normalize to 'number'
		}

		groupMember := ModelsGroup.GroupMember{
			GroupID:  payload.GroupID,
			UserID:   m.UserID,
			Role:     roleCode,
			Status:   "active",
			JoinedAt: time.Now(),
		}

		// 1. Create legacy member record (if needed)
		_ = groupBiz.CreateGroupNumber(ctx, &groupMember)

		// 2. Sync to group_user_roles (Formal RBAC)
		// Retry 3 times if error occurs
		var rbErr error
		for attempt := 0; attempt < 3; attempt++ {
			rbErr = groupStore.UpdateMemberRole(ctx, payload.GroupID, m.UserID, roleCode)
			if rbErr == nil {
				break
			}

			log.Printf("[group-member] RBAC Sync Retry %d/3 for user %s: %v", attempt+1, m.UserID.Hex(), rbErr)
			if attempt < 2 {
				time.Sleep(time.Duration(attempt+1) * 200 * time.Millisecond)
			}
		}

		if rbErr != nil {
			log.Printf("[group-member] RBAC Sync FAILED after retries for user %s: %v", m.UserID.Hex(), rbErr)
			continue
		}
	}

	// If all successful -> commit Kafka
	c.commitQueue <- &commitTask{
		session: sess,
		message: msg,
	}
	log.Printf("[group-member] Processed %d members for GroupID %s", len(payload.Members), payload.GroupID)
}

func (c *chatConsumer) processUnPinnedMessage(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var payload models.MessageResponseSocket

	if err := json.Unmarshal(msg.Value, &payload); err != nil {
		log.Printf("[recall-message] Unmarshal error: %v | payload: %s", err, string(msg.Value))
		sess.MarkMessage(msg, "")
		return
	}
	// Biz
	recallStore := storage.NewMongoChatStore(c.db)
	recallBiz := biz.NewUnPinnedMessageBiz(recallStore)

	MessageID, _ := primitive.ObjectIDFromHex(payload.MessageID)
	ConversationID, _ := primitive.ObjectIDFromHex(payload.ConversationID)

	fmt.Println("ConversationID Kaffka", ConversationID)
	// Retry 3 times
	var recallErr error
	for attempt := 0; attempt < 3; attempt++ {
		recallErr = recallBiz.UnpinMessage(ctx, ConversationID, MessageID)
		if recallErr == nil {
			// Success: Commit
			c.commitQueue <- &commitTask{
				session: sess,
				message: msg,
			}
			return
		}

		log.Printf("[pinned-message] Retry %d/3: %v", attempt+1, recallErr)
		if attempt < 2 {
			time.Sleep(time.Duration(attempt+1) * 200 * time.Millisecond)
		}
	}

	log.Printf("[pinned-message] FAILED after retries: %v", recallErr)
}

func (c *chatConsumer) processPinnedMessage(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var payload models.MessageResponseSocket

	if err := json.Unmarshal(msg.Value, &payload); err != nil {
		log.Printf("[pinned-message] Unmarshal error: %v | payload: %s", err, string(msg.Value))
		sess.MarkMessage(msg, "")
		return
	}

	// Convert IDs from string to primitive.ObjectID
	messageID, errMsg := primitive.ObjectIDFromHex(payload.MessageID)
	if errMsg != nil {
		log.Printf("[pinned-message] Invalid MessageID: %v", errMsg)
		sess.MarkMessage(msg, "")
		return
	}

	pinnedByID, errPin := primitive.ObjectIDFromHex(payload.PinnedByID)
	if errPin != nil {
		log.Printf("[pinned-message] Invalid PinnedByID: %v", errPin)
		sess.MarkMessage(msg, "")
		return
	}

	// === DETERMINE targetConvID CONDITIONALLY ===
	var targetConvID primitive.ObjectID
	var convIDFromHex primitive.ObjectID
	var errConv error

	// Priority 1: If valid GroupID exists -> this is a group -> use GroupID
	if payload.GroupID != primitive.NilObjectID { // primitive.NilObjectID is the zero value of ObjectID
		targetConvID = payload.GroupID
		log.Printf("[pinned-message] Using GroupID as targetConvID: %s", targetConvID.Hex())
	} else {
		// Priority 2: No GroupID -> personal chat -> use ConversationID (string)
		if payload.ConversationID == "" {
			log.Printf("[pinned-message] Missing both GroupID and ConversationID")
			sess.MarkMessage(msg, "")
			return
		}

		convIDFromHex, errConv = primitive.ObjectIDFromHex(payload.ConversationID)
		if errConv != nil {
			log.Printf("[pinned-message] Invalid ConversationID format: %v", errConv)
			sess.MarkMessage(msg, "")
			return
		}
		targetConvID = convIDFromHex
		log.Printf("[pinned-message] Using ConversationID as targetConvID: %s", targetConvID.Hex())
	}

	// Biz logic
	pinStore := storage.NewMongoChatStore(c.db)
	pinBiz := biz.NewPinnedMessageBiz(pinStore)

	// Retry 3 times
	var pinErr error
	for attempt := 0; attempt < 3; attempt++ {
		pinErr = pinBiz.PinMessage(ctx, targetConvID, messageID, pinnedByID, "")
		if pinErr == nil {
			// Success → commit
			c.commitQueue <- &commitTask{
				session: sess,
				message: msg,
			}
			return
		}

		log.Printf("[pinned-message] Retry %d/3 failed: %v", attempt+1, pinErr)
		if attempt < 2 {
			time.Sleep(time.Duration(attempt+1) * 200 * time.Millisecond)
		}
	}

	// Failed after 3 retries
	log.Printf("[pinned-message] FAILED after 3 retries for message %s in conv %s: %v",
		payload.MessageID, targetConvID.Hex(), pinErr)
	sess.MarkMessage(msg, "") // Still mark to avoid perpetual reconsumption
}

func (c *chatConsumer) processRecallMessage(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var payload models.MessageResponse

	if err := json.Unmarshal(msg.Value, &payload); err != nil {
		log.Printf("[recall-message] Unmarshal error: %v | payload: %s", err, string(msg.Value))
		sess.MarkMessage(msg, "")
		return
	}
	// Biz
	recallStore := storage.NewMongoChatStore(c.db)
	esStore := storage.NewESChatStore(c.es)
	recallBiz := biz.NewRecallMessageBiz(recallStore, esStore)

	// Retry 3 times
	var recallErr error
	for attempt := 0; attempt < 3; attempt++ {
		recallErr = recallBiz.RecallMessage(ctx, payload.ID, *payload.RecalledBy)
		if recallErr == nil {
			// Success: Commit
			c.commitQueue <- &commitTask{
				session: sess,
				message: msg,
			}
			return
		}

		log.Printf("[recall-message] Retry %d/3: %v", attempt+1, recallErr)
		if attempt < 2 {
			time.Sleep(time.Duration(attempt+1) * 200 * time.Millisecond)
		}
	}

	log.Printf("[recall-message] FAILED after retries: %v", recallErr)
	// ❗ Do not commit -> Kafka will deliver this message again
}

func (c *chatConsumer) processChatMessage(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var chatMsg models.MessageResponse
	if err := json.Unmarshal(msg.Value, &chatMsg); err != nil {
		log.Printf(" Unmarshal error: %v", err)
		return
	}

	// FIX: Pass session and message to commit after successful insert
	c.batchProcessor.Add(chatMsg, sess, msg)
}

func (c *chatConsumer) processUpdateStatus(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var statusMsg models.MessageStatusRequest
	if err := json.Unmarshal(msg.Value, &statusMsg); err != nil {
		log.Printf(" Unmarshal error: %v", err)
		return
	}

	// Process synchronously với retry
	for retry := 0; retry < 3; retry++ {
		err := c.updateStatusWithRetry(ctx, &statusMsg)
		if err == nil {
			c.commitQueue <- &commitTask{session: sess, message: msg}
			return
		}
		if retry < 2 {
			time.Sleep(time.Duration(retry+1) * 100 * time.Millisecond)
		}
	}

	log.Printf(" Failed to update status after 3 retries")
}

func (c *chatConsumer) processUserStatus(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var userStatus ModelsUser.UserStatus

	if err := json.Unmarshal(msg.Value, &userStatus); err != nil {
		log.Println("Unmarshal error:", err)
		return
	}

	userStatusStore := StorageUser.NewMongoStore(c.db)
	userStatusBiz := BizUser.NewUserStatusBiz(userStatusStore)

	var err error
	for retry := 0; retry < 3; retry++ {
		err = userStatusBiz.Upsert(ctx, &userStatus)
		if err == nil {
			// upsert OK -> commit
			c.commitQueue <- &commitTask{
				session: sess,
				message: msg,
			}
			return
		}

		if retry < 2 {
			time.Sleep(time.Duration(retry+1) * 100 * time.Millisecond)
		}
	}

	log.Printf("Update user_status error after 3 retries: %v", err)
	// ❗ Do not commit -> message will reprocess
}

func (c *chatConsumer) processGroupOut(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var groupOut models.MessageResponse
	if err := json.Unmarshal(msg.Value, &groupOut); err != nil {
		log.Println("Kafka Unmarshal error (group-out):", err)
		return
	}

	// Validate mandatory data
	if groupOut.GroupID.IsZero() || groupOut.SenderID.IsZero() {
		log.Printf("Invalid group-out payload (missing id): %s\n", string(msg.Value))
		return
	}

	// Create a separate context with a short timeout to avoid blocking
	opCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Create store + biz (as current). For optimization, see notes below to reuse.
	GroupStore := StorageGroup.NewMongoStoreGroup(c.db)
	GroupBiz := BizGroup.NewRemoveGroupMemberBiz(GroupStore)

	var err error
	for retry := 0; retry < 3; retry++ {
		_, err = GroupBiz.RemoveMember(opCtx, "", groupOut.GroupID.Hex(), groupOut.SenderID.Hex())
		if err == nil {
			c.commitQueue <- &commitTask{
				session: sess,
				message: msg,
			}
			return
		}

		// Retry with small exponential backoff
		if retry < 2 {
			backoff := time.Duration(retry+1) * 150 * time.Millisecond
			log.Printf("Retry %d/3 removing member from group %s: %v (backoff %s)", retry+1, groupOut.GroupID.Hex(), err, backoff)
			time.Sleep(backoff)
		}
	}
	log.Printf("CRITICAL: Failed to remove member %s from group %s after 3 retries: %v", groupOut.SenderID.Hex(), groupOut.GroupID.Hex(), err)
}

func (c *chatConsumer) processDeleteMessageForMe(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var delMsg models.DeleteMessageForMe
	if err := json.Unmarshal(msg.Value, &delMsg); err != nil {
		log.Printf("[delete-message-for-me] Unmarshal error: %v | payload: %s", err, string(msg.Value))
		// Incorrect data -> cannot process -> commit to avoid infinite loop
		sess.MarkMessage(msg, "")
		return
	}

	// Validate UserID
	userID, err := primitive.ObjectIDFromHex(delMsg.UserID)
	if err != nil {
		log.Printf("[delete-message-for-me] Invalid UserID: %s | err: %v", delMsg.UserID, err)
		sess.MarkMessage(msg, "")
		return
	}

	// Convert MessageIDs
	var messageIDs []primitive.ObjectID
	hasInvalid := false
	for _, idStr := range delMsg.MessageIDs {
		oid, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			log.Printf("[delete-message-for-me] Invalid MessageID: %s | err: %v", idStr, err)
			hasInvalid = true
			continue
		}
		messageIDs = append(messageIDs, oid)
	}

	// If all IDs are errors or none are valid -> commit immediately
	if hasInvalid && len(messageIDs) == 0 {
		log.Printf("[delete-message-for-me] No valid MessageIDs from user %s", delMsg.UserID)
		sess.MarkMessage(msg, "")
		return
	}

	// Create biz
	chatStore := storage.NewMongoChatStore(c.db)
	esStore := storage.NewESChatStore(c.es)
	chatBiz := biz.NewDeleteMessageForMeBiz(chatStore, esStore)

	// Retry 3 times
	var deleteErr error
	for attempt := 0; attempt < 3; attempt++ {
		deleteErr = chatBiz.DeleteMessageForMe(ctx, userID, messageIDs)
		if deleteErr == nil {
			// SUCCESS -> send to commit queue
			c.commitQueue <- &commitTask{
				session: sess,
				message: msg,
			}
			log.Printf("[delete-message-for-me] User %s deleted %d messages successfully (commit queued)", delMsg.UserID, len(messageIDs))
			return
		}

		// Log error + backoff
		log.Printf("[delete-message-for-me] Error attempt %d/3 - User %s deleting %d msgs: %v", attempt+1, delMsg.UserID, len(messageIDs), deleteErr)
		if attempt < 2 {
			time.Sleep(time.Duration(attempt+1) * 200 * time.Millisecond)
		}
	}

	// After 3 failed attempts -> DO NOT commit -> Kafka will re-deliver
	log.Printf("[delete-message-for-me] CRITICAL: User %s failed to delete messages after 3 retries -> will be reprocessed", delMsg.UserID)
	// No MarkMessage -> message will be re-consumed on next rebalance
}

func (c *chatConsumer) updateStatusWithRetry(ctx context.Context, statusMsg *models.MessageStatusRequest) error {
	senderID, _ := primitive.ObjectIDFromHex(statusMsg.SenderID)
	receiverID, _ := primitive.ObjectIDFromHex(statusMsg.ReceiverID)
	lastSeenMsgID, _ := primitive.ObjectIDFromHex(statusMsg.LastSeenMsgID)

	chatStore := storage.NewMongoChatStore(c.db)
	chatBiz := biz.UpdateSeenStatusStorage(chatStore)

	// Check if receiverID is a group
	isGroup, err := chatStore.CheckGroupExists(ctx, statusMsg.ReceiverID)
	var conversationID primitive.ObjectID
	if err == nil && isGroup {
		conversationID = receiverID
	} else {
		conversationID = storage.GetConversationID(senderID, receiverID)
	}

	if err := chatBiz.CreateOrUpdate(ctx, senderID, conversationID, lastSeenMsgID); err != nil {
		return err
	}

	return chatBiz.UpdateStatusSeen(ctx, receiverID, senderID, lastSeenMsgID, primitive.NilObjectID)
}

func (c *chatConsumer) Shutdown() {
	log.Println(" Shutting down consumer...")
	c.wg.Wait()              // Wait for all workers
	c.batchProcessor.Close() // Wait for batch processor
	close(c.commitQueue)     // Close commit queue
	log.Println("Consumer shutdown gracefully")
}
