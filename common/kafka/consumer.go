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

	// Flush trong lock để tránh race condition
	if len(bp.messages) >= bp.maxBatchSize {
		bp.flushLocked() // Flush ngay trong lock
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

	// Process trong goroutine riêng để không block lock
	bp.processingWg.Add(1)
	go bp.processBatch(messages)
}

// ======================== FIX #3: Synchronous insert with retry + commit ONLY on success ========================
func (bp *BatchProcessor) processBatch(messages []messageWithCommit) {
	defer bp.processingWg.Done()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	chatStore := storage.NewMongoChatStore(bp.db)
	esChatStore := storage.NewESChatStore(bp.es)
	chatBiz := biz.NewChatBiz(chatStore, esChatStore)

	for _, msgWithCommit := range messages {
		msg := msgWithCommit.message

		// Retry logic: tối đa 3 lần
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
			)

			if err == nil {
				// SUCCESS: Commit offset chỉ khi insert thành công
				bp.commitQueue <- &commitTask{
					session: msgWithCommit.session,
					message: msgWithCommit.kafkaMsg,
				}
				break
			}

			// Retry với exponential backoff
			if retry < 2 {
				time.Sleep(time.Duration(retry+1) * 100 * time.Millisecond)
				log.Printf(" Retry %d/3 for message %s: %v", retry+1, msg.ID.Hex(), err)
			}
		}

		if err != nil {
			// FAILED after 3 retries: KHÔNG commit offset → message sẽ được reprocess
			log.Printf(" CRITICAL: Failed to insert message %s after 3 retries: %v", msg.ID.Hex(), err)
			// Có thể gửi vào Dead Letter Queue ở đây
		}
	}
}

func (bp *BatchProcessor) Close() {
	close(bp.done)
	bp.flushTicker.Stop()
	bp.Flush()
	bp.processingWg.Wait() // Đợi tất cả batch xử lý xong
}

// ======================== FIX #1: Manual commit with dedicated goroutine ========================
func StartConsumer(ctx context.Context, brokers []string, groupID string, topics []string, db *mongo.Database, es *elasticsearch.Client) error {
	config := sarama.NewConfig()
	config.Version = sarama.V2_8_0_0
	config.Consumer.Return.Errors = true
	config.Consumer.Group.Rebalance.Strategy = sarama.NewBalanceStrategyRoundRobin()

	// FIX: DISABLE auto-commit
	config.Consumer.Offsets.AutoCommit.Enable = false

	config.ChannelBufferSize = 10000
	config.Consumer.Fetch.Min = 1024 * 1024
	config.Consumer.Fetch.Default = 1024 * 1024 * 10
	config.Consumer.MaxProcessingTime = 60 * time.Second
	config.Consumer.Group.Session.Timeout = 20 * time.Second
	config.Consumer.Group.Heartbeat.Interval = 6 * time.Second
	config.Consumer.MaxWaitTime = 500 * time.Millisecond
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
		workerPool:     make(chan struct{}, 100),
		batchProcessor: NewBatchProcessor(db, es, 100, commitQueue),
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

// ======================== FIX #1: Commit chỉ sau khi insert thành công ========================
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

			// Commit toàn bộ messages
			for _, t := range commitBatch {
				t.session.MarkMessage(t.message, "")
			}

			// Commit batch offset
			commitBatch[0].session.Commit()

			commitBatch = commitBatch[:0]

		case <-ctx.Done():
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

		//  FIX: KHÔNG commit ở đây nữa
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

	// Lặp qua tất cả member
	for _, m := range payload.Members {
		groupMember := ModelsGroup.GroupMember{
			GroupID:  payload.GroupID,
			UserID:   m.UserID,
			Role:     m.Role,
			Status:   "active", // hoặc giá trị mặc định khác nếu cần
			JoinedAt: time.Now(),
		}

		// Retry 3 lần nếu gặp lỗi
		var insertErr error
		for attempt := 0; attempt < 3; attempt++ {
			insertErr = groupBiz.CreateGroupNumber(ctx, &groupMember)
			if insertErr == nil {
				break // thành công → thoát vòng retry
			}

			log.Printf("[group-member] Retry %d/3 for user %s: %v", attempt+1, m.UserID.Hex(), insertErr)
			if attempt < 2 {
				time.Sleep(time.Duration(attempt+1) * 200 * time.Millisecond)
			}
		}

		if insertErr != nil {
			log.Printf("[group-member] FAILED after retries for user %s: %v", m.UserID.Hex(), insertErr)
			// Tùy bạn có commit hay không, nếu muốn message được re-deliver thì không commit
			continue
		}
	}

	// Nếu tất cả thành công → commit Kafka
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

	// Retry 3 lần
	var recallErr error
	for attempt := 0; attempt < 3; attempt++ {
		recallErr = recallBiz.UnpinMessage(ctx, ConversationID, MessageID)
		if recallErr == nil {
			// Thành công: Commit
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
		log.Printf("[recall-message] Unmarshal error: %v | payload: %s", err, string(msg.Value))
		sess.MarkMessage(msg, "")
		return
	}
	// Biz
	recallStore := storage.NewMongoChatStore(c.db)
	recallBiz := biz.NewPinnedMessageBiz(recallStore)

	messageID, _ := primitive.ObjectIDFromHex(payload.MessageID)
	pinnedByID, _ := primitive.ObjectIDFromHex(payload.PinnedByID)
	targetConvID, _ := primitive.ObjectIDFromHex(payload.ConversationID)
	// Retry 3 lần
	var recallErr error
	for attempt := 0; attempt < 3; attempt++ {
		recallErr = recallBiz.PinMessage(ctx, targetConvID, messageID, pinnedByID, "")
		if recallErr == nil {
			// Thành công: Commit
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

func (c *chatConsumer) processRecallMessage(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var payload models.MessageResponse

	if err := json.Unmarshal(msg.Value, &payload); err != nil {
		log.Printf("[recall-message] Unmarshal error: %v | payload: %s", err, string(msg.Value))
		sess.MarkMessage(msg, "")
		return
	}
	// Biz
	recallStore := storage.NewMongoChatStore(c.db)
	recallBiz := biz.NewRecallMessageBiz(recallStore)

	// Retry 3 lần
	var recallErr error
	for attempt := 0; attempt < 3; attempt++ {
		recallErr = recallBiz.RecallMessage(ctx, payload.ID, *payload.RecalledBy)
		if recallErr == nil {
			// Thành công: Commit
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
	// ❗ Không commit → Kafka sẽ giao lại message này
}

func (c *chatConsumer) processChatMessage(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var chatMsg models.MessageResponse
	if err := json.Unmarshal(msg.Value, &chatMsg); err != nil {
		log.Printf(" Unmarshal error: %v", err)
		return
	}

	//  FIX: Truyền session và message để commit sau khi insert thành công
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
	// ❗ Không commit → message sẽ reprocess
}

func (c *chatConsumer) processGroupOut(ctx context.Context, sess sarama.ConsumerGroupSession, msg *sarama.ConsumerMessage) {
	var groupOut models.MessageResponse
	if err := json.Unmarshal(msg.Value, &groupOut); err != nil {
		log.Println("Kafka Unmarshal error (group-out):", err)
		return
	}

	// Validate dữ liệu bắt buộc
	if groupOut.GroupID.IsZero() || groupOut.SenderID.IsZero() {
		log.Printf("Invalid group-out payload (missing id): %s\n", string(msg.Value))
		return
	}

	// Tạo context riêng với timeout ngắn tránh block
	opCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Tạo store + biz (như hiện tại). Nếu muốn tối ưu, see notes dưới để reuse.
	GroupStore := StorageGroup.NewMongoStoreGroup(c.db)
	GroupBiz := BizGroup.NewRemoveGroupMemberBiz(GroupStore)

	var err error
	for retry := 0; retry < 3; retry++ {
		err = GroupBiz.RemoveMember(opCtx, groupOut.GroupID.Hex(), groupOut.SenderID.Hex())
		if err == nil {
			c.commitQueue <- &commitTask{
				session: sess,
				message: msg,
			}
			return
		}

		// Retry với exponential backoff nhỏ
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
		// Dữ liệu sai → không thể xử lý → commit để tránh loop vô hạn
		sess.MarkMessage(msg, "")
		return
	}

	// Validate UserID
	userID, err := primitive.ObjectIDFromHex(delMsg.UserID)
	if err != nil {
		log.Printf("[delete-message-for-me] UserID không hợp lệ: %s | err: %v", delMsg.UserID, err)
		sess.MarkMessage(msg, "")
		return
	}

	// Convert MessageIDs
	var messageIDs []primitive.ObjectID
	hasInvalid := false
	for _, idStr := range delMsg.MessageIDs {
		oid, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			log.Printf("[delete-message-for-me] MessageID không hợp lệ: %s | err: %v", idStr, err)
			hasInvalid = true
			continue
		}
		messageIDs = append(messageIDs, oid)
	}

	// Nếu toàn bộ ID đều lỗi hoặc không có ID nào hợp lệ → commit luôn
	if hasInvalid && len(messageIDs) == 0 {
		log.Printf("[delete-message-for-me] Không có MessageID hợp lệ nào từ user %s", delMsg.UserID)
		sess.MarkMessage(msg, "")
		return
	}

	// Tạo biz
	chatStore := storage.NewMongoChatStore(c.db)
	chatBiz := biz.NewDeleteMessageForMeBiz(chatStore)

	// Retry 3 lần
	var deleteErr error
	for attempt := 0; attempt < 3; attempt++ {
		deleteErr = chatBiz.DeleteMessageForMe(ctx, userID, messageIDs)
		if deleteErr == nil {
			// THÀNH CÔNG → gửi vào hàng đợi commit
			c.commitQueue <- &commitTask{
				session: sess,
				message: msg,
			}
			log.Printf("[delete-message-for-me] User %s đã xóa thành công %d tin nhắn (commit queued)", delMsg.UserID, len(messageIDs))
			return
		}

		// Log lỗi + backoff
		log.Printf("[delete-message-for-me] Lỗi lần %d/3 - User %s xóa %d tin: %v", attempt+1, delMsg.UserID, len(messageIDs), deleteErr)
		if attempt < 2 {
			time.Sleep(time.Duration(attempt+1) * 200 * time.Millisecond)
		}
	}

	// Sau 3 lần vẫn lỗi → KHÔNG commit → Kafka sẽ re-deliver
	log.Printf("[delete-message-for-me] CRITICAL: User %s xóa tin nhắn thất bại sau 3 lần retry → sẽ được xử lý lại", delMsg.UserID)
	// Không MarkMessage → message sẽ được consume lại ở lần rebalance tiếp theo
}

func (c *chatConsumer) updateStatusWithRetry(ctx context.Context, statusMsg *models.MessageStatusRequest) error {
	senderID, _ := primitive.ObjectIDFromHex(statusMsg.SenderID)
	receiverID, _ := primitive.ObjectIDFromHex(statusMsg.ReceiverID)
	lastSeenMsgID, _ := primitive.ObjectIDFromHex(statusMsg.LastSeenMsgID)

	chatStore := storage.NewMongoChatStore(c.db)
	chatBiz := biz.UpdateSeenStatusStorage(chatStore)
	conversationID := storage.GetConversationID(senderID, receiverID)
	seen, _ := chatBiz.FindByUserAndConversation(ctx, senderID, conversationID)
	var oldLastSeenMsgID primitive.ObjectID
	if seen != nil {
		oldLastSeenMsgID = seen.LastSeenMessageID
	}

	if err := chatBiz.CreateOrUpdate(ctx, senderID, conversationID, lastSeenMsgID); err != nil {
		return err
	}

	return chatBiz.UpdateStatusSeen(ctx, receiverID, senderID, lastSeenMsgID, oldLastSeenMsgID)
}

func (c *chatConsumer) Shutdown() {
	log.Println(" Shutting down consumer...")
	c.wg.Wait()              // Đợi tất cả worker
	c.batchProcessor.Close() // Đợi batch processor
	close(c.commitQueue)     // Đóng commit queue
	log.Println("Consumer shutdown gracefully")
}
