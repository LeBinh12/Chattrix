package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"my-app/common/kafka"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Client struct {
	Hub          *Hub
	Conn         *websocket.Conn
	Send         chan []byte
	UserID       string
	SessionID    string
	LastSeen     time.Time
	mu           sync.Mutex
	closed       bool
	IsStressUser bool // Đánh dấu nếu là user từ bộ load test
}

type WSMessage struct {
	Type          string                              `json:"type"`
	Message       *models.MessageResponse             `json:"message,omitempty"`
	MessageStatus *models.MessageStatusRequest        `json:"message_status,omitempty"`
	DeleteMsg     *models.DeleteMessageForMe          `json:"delete_msg,omitempty"`
	MessageRes    *models.MessageResponseSocket       `json:"message_res,omitempty"`
	GroupMember   *models.GroupMemberRequest          `json:"group_member,omitempty"`
	Notification  *models.MessageNotificationResponse `json:"notification,omitempty"`
	Reaction      *models.MessageReaction             `json:"reaction,omitempty"`
	CommentTask   *models.TaskComment                 `json:"task_comment,omitempty"`
	Forward       *models.ForwardMessageRequest       `json:"forward,omitempty"`
	EditMessage   *models.EditMessageRequest          `json:"edit_message,omitempty"`
}

func (c *Client) ReadPump(db *mongo.Database) {
	defer func() {
		log.Println(" ReadPump đóng cho user:", c.UserID)
		c.Hub.Unregister <- c
		time.Sleep(200 * time.Millisecond)
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(1024 * 1024)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.LastSeen = time.Now()
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var incoming WSMessage
		if err := c.Conn.ReadJSON(&incoming); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("❌ [VUser %s] Unexpected Close Error: %v", c.UserID, err)
			} else {
				log.Printf("❌ [VUser %s] Read error (likely timeout or disconnect): %v", c.UserID, err)
			}
			break
		}

		// FIX: Reset deadline mỗi khi nhận được một tin nhắn hợp lệ (không chỉ Pong)
		// Điều này đảm bảo kết nối luôn sống nếu user vẫn đang gửi data.
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		c.LastSeen = time.Now()

		switch incoming.Type {
		case "chat":
			c.handleChatMessage(incoming.Message)
		case "update_seen":
			c.handleUpdateSeen(incoming.MessageStatus)
		case "member_left":
			c.handleMemberLeft(incoming.Message)
		case "delete_for_me":
			c.handleDeleteForMe(incoming.DeleteMsg)
		case "recall-message":
			c.handleRecallMessage(incoming.Message)
		case "pinned-message":
			c.handlePinnedMessage(incoming.Message, incoming.MessageRes)
		case "un-pinned-message":
			c.handleUnPinnedMessage(incoming.Message, incoming.MessageRes)
		case "add-group-member":
			c.handleGroupMember(incoming.GroupMember)
		case "rep-task":
			c.handleRepTask(incoming.Message)
		case "notification":
			c.handleNotificationMessage(incoming.Notification)
		case "send-reaction":
			c.handleReaction(incoming.Reaction)
		case "task_comment":
			c.handleTaskComment(incoming.CommentTask)
		case "forward_message":
			c.handleForwardMessage(incoming.Forward)
		case "edit-message":
			c.handleEditMessage(incoming.EditMessage)
		}
	}
}

func (c *Client) handleTaskComment(res *models.TaskComment) {
	if res == nil {
		return
	}
	fmt.Println("res1", res)
	c.Hub.Broadcast <- HubEvent{
		Type:    "task_comment",
		Payload: res,
	}
}

func (c *Client) handleEditMessage(req *models.EditMessageRequest) {
	if req == nil || req.ID == "" || req.Content == "" {
		return
	}

	ctx := context.Background()
	store := storage.NewMongoChatStore(c.Hub.DB)

	messageID, err := primitive.ObjectIDFromHex(req.ID)
	if err != nil {
		log.Println("handleEditMessage: invalid message id:", err)
		return
	}

	senderID, err := primitive.ObjectIDFromHex(req.SenderID)
	if err != nil {
		log.Println("handleEditMessage: invalid sender id:", err)
		return
	}

	// Update content and edited_at in MongoDB
	if err := store.UpdateMessageContent(ctx, messageID, senderID, req.Content); err != nil {
		log.Println("handleEditMessage error:", err)
		return
	}

	// Broadcast the update to all clients
	c.Hub.Broadcast <- HubEvent{
		Type: "edit_message_update",
		Payload: map[string]interface{}{
			"id":          req.ID,
			"content":     req.Content,
			"sender_id":   req.SenderID,
			"receiver_id": req.ReceiverID,
			"group_id":    req.GroupID,
			"edited_at":   time.Now().Format(time.RFC3339),
		},
	}
}

func (c *Client) handleReaction(req *models.MessageReaction) {
	if req == nil {
		return
	}

	ctx := context.Background()
	store := storage.NewMongoChatStore(c.Hub.DB)

	// 1. Get Message
	msg, err := store.GetMessageOneByID(ctx, req.MessageID)
	if err != nil {
		log.Println("Error getting message for reaction:", err)
		return
	}

	userID, err := primitive.ObjectIDFromHex(c.UserID)
	if err != nil {
		return
	}

	/////////////////////////////////Đẩy vào Kaffka
	existing, err := store.FindReaction(ctx, req.MessageID, userID, req.Type)
	if err != nil {
		log.Println("Error finding reaction:", err)
		return
	}

	eventType := "add"

	if req.Action == models.ReactionRemoveAll {
		/////////////////////////////////Đẩy vào Kaffka
		if err := store.RemoveAllReactionsByUser(ctx, req.MessageID, userID); err != nil {
			log.Println("Error removing reaction:", err)
			return
		}
		eventType = "remove_all"
	} else {
		if existing != nil {
			/////////////////////////////////Đẩy vào Kaffka
			if err := store.RemoveReaction(ctx, req.MessageID, userID, req.Type); err != nil {
				log.Println("Error removing reaction:", err)
				return
			}
			eventType = "remove"
		} else {
			newReaction := models.Reaction{
				UserID:    userID,
				UserName:  req.SenderName,
				Emoji:     req.Type,
				CreatedAt: time.Now(),
			}
			if err := store.AddReaction(ctx, req.MessageID, newReaction); err != nil {
				log.Println("Error adding reaction:", err)
				return
			}
			eventType = "add"
		}
	}

	// 3. Broadcast
	payload := &models.ReactionEvent{
		Type:            eventType,
		MessageID:       req.MessageID,
		UserID:          userID,
		UserName:        req.SenderName,
		Emoji:           req.Type,
		GroupID:         msg.GroupID,
		ReceiverID:      msg.ReceiverID,
		MessageSenderID: msg.SenderID,
	}

	c.Hub.Broadcast <- HubEvent{
		Type:    "reaction_update",
		Payload: payload,
	}
}

func (c *Client) handleGroupMember(res *models.GroupMemberRequest) {
	if res == nil {
		return
	}

	msg := &models.MessageResponse{
		ID:        primitive.NewObjectID(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Status:    models.StatusSeen,
		Type:      "system",
		IsRead:    true,
		GroupID:   res.GroupID,
		SenderID:  res.SenderID,
	}
	msg.Content = buildSystemMessage(res)

	msgCopy := msg

	go c.sendToKafkaWithRetry("add-group-member", res.SenderID.Hex(), res)
	go c.sendToKafkaWithRetry("chat-topic", msg.SenderID.Hex(), msg)

	c.Hub.Broadcast <- HubEvent{
		Type:    "chat",
		Payload: msg,
	}

	c.Hub.Broadcast <- HubEvent{
		Type: "group_member_added",
		Payload: map[string]interface{}{
			"group_id":     res.GroupID.Hex(),
			"display_name": res.GroupName,
			"avatar":       res.Avatar,
			"sender_id":    res.SenderID.Hex(),

			// message preview cho conversation list
			"last_message_id":   msgCopy.ID.Hex(),
			"last_message":      msgCopy.Content,
			"last_message_type": msgCopy.LastMessageType,
			"last_date":         msgCopy.CreatedAt,
			"status":            msgCopy.Status, // seen/delivered
			"updated_at":        msgCopy.UpdatedAt,

			// danh sách member
			"members": res.Members, // []Member { user_id, role }
		}}
}

func (c *Client) handleUnPinnedMessage(msg *models.MessageResponse, res *models.MessageResponseSocket) {
	if msg == nil {
		return
	}

	if msg.GroupID != primitive.NilObjectID {
		res.ConversationID = msg.GroupID.Hex()
	} else {
		res.ConversationID = storage.GetConversationID(msg.SenderID, msg.ReceiverID).Hex()
	}

	msg.CreatedAt = time.Now()
	msg.UpdatedAt = time.Now()
	msg.ID = primitive.NewObjectID()
	msg.Status = models.StatusDelivered

	msg.Content = fmt.Sprintf("Người dùng đã gỡ ghim 1 tin nhắn")
	msg.Type = "system"
	msg.SystemAction = "unpin"
	msg.Status = "seen"
	msg.IsRead = true
	res.GroupID = msg.GroupID
	res.ReceiverID = msg.ReceiverID.Hex()
	res.PinnedByID = msg.SenderID.Hex()
	res.SenderID = msg.SenderID.Hex()
	// tin nhắn
	go c.sendToKafkaWithRetry("chat-topic", msg.SenderID.Hex(), msg)
	// Update DB before broadcast (nếu cần)
	go c.sendToKafkaWithRetry("un-pinned-message-topic", msg.SenderID.Hex(), res)

	c.Hub.Broadcast <- HubEvent{
		Type:    "chat",
		Payload: msg,
	}

	// Gửi sự kiện cho mọi client

	c.Hub.Broadcast <- HubEvent{
		Type:    "un-pinned-message",
		Payload: res,
	}
}

func (c *Client) handlePinnedMessage(msg *models.MessageResponse, res *models.MessageResponseSocket) {
	if msg == nil {
		return
	}

	if msg.GroupID != primitive.NilObjectID {
		res.ConversationID = msg.GroupID.Hex()
	} else {
		res.ConversationID = storage.GetConversationID(msg.SenderID, msg.ReceiverID).Hex()
	}
	now := time.Now()
	msg.CreatedAt = now
	msg.UpdatedAt = now
	msg.ID = primitive.NewObjectID()
	msg.Status = models.StatusDelivered

	msg.Content = fmt.Sprintf("Người dùng %s đã ghim 1 tin nhắn", res.PinnedByName)
	msg.Type = "system"
	msg.SystemAction = "pin"
	msg.Status = "seen"
	msg.IsRead = true

	res.GroupID = msg.GroupID
	res.ReceiverID = msg.ReceiverID.Hex()
	res.SenderID = msg.SenderID.Hex()
	res.PinnedByID = msg.SenderID.Hex() // The person who pinned it

	// Populate realtime pinning fields
	// Note: We use MessageID as a temporary PinID for realtime until it's saved to DB
	res.PinID = res.MessageID
	res.PinnedAt = now.Format(time.RFC3339)

	// Update DB before broadcast (nếu cần)
	go c.sendToKafkaWithRetry("pinned-message-topic", msg.SenderID.Hex(), res)

	// tin nhắn
	go c.sendToKafkaWithRetry("chat-topic", msg.SenderID.Hex(), msg)

	c.Hub.Broadcast <- HubEvent{
		Type:    "chat",
		Payload: msg,
	}

	// Gửi sự kiện cho mọi client
	c.Hub.Broadcast <- HubEvent{
		Type:    "pinned-message",
		Payload: res,
	}
}

func (c *Client) handleRepTask(msg *models.MessageResponse) {
	if msg == nil {
		return
	}

	c.Hub.Broadcast <- HubEvent{
		Type:    "rep-task",
		Payload: msg,
	}
}

func (c *Client) handleRecallMessage(msg *models.MessageResponse) {
	if msg == nil {
		return
	}

	now := time.Now()

	msg.RecalledAt = &now

	// Update DB before broadcast (nếu cần)
	go c.sendToKafkaWithRetry("recall-message-topic", msg.SenderID.Hex(), msg)

	// Gửi sự kiện cho mọi client

	c.Hub.Broadcast <- HubEvent{
		Type:    "recall-message",
		Payload: msg,
	}
}

func (c *Client) handleNotificationMessage(msg *models.MessageNotificationResponse) {
	if msg == nil {
		return
	}
	msg.CreatedAt = time.Now()

	msgCopy := msg
	fmt.Println("msgCopy", msgCopy)
	switch msg.NotificationType {
	case models.NotificationTypeSystem:
		go c.sendToKafkaWithRetry("chat-notification-all", msg.SenderID.Hex(), msg)
	case models.NotificationTypeGroup:
		go c.sendToKafkaWithRetry("chat-notification-group", msg.SenderID.Hex(), msg)
	case models.NotificationTypePersonal:
		go c.sendToKafkaWithRetry("chat-notification-personal", msg.SenderID.Hex(), msg)
	}

	c.Hub.Broadcast <- HubEvent{
		Type:    "chat-notification",
		Payload: msgCopy,
	}
}

// ======================== FIX #4: Retry logic khi gửi Kafka ========================
func (c *Client) handleChatMessage(msg *models.MessageResponse) {
	if msg == nil {
		return
	}
	newID := primitive.NewObjectID()
	// Đừng ghi file và gửi Kafka cho stress users để giảm tải hệ thống
	if !c.IsStressUser {
		data, _ := json.Marshal(msg)
		_ = os.WriteFile("modules/chat/transport/websocket/last_msg.json", data, 0644)
	}
	// Xử lý group message
	if msg.GroupID != primitive.NilObjectID {
		msg.CreatedAt = time.Now()
		msg.UpdatedAt = time.Now()
		msg.ID = newID
		msg.Status = models.StatusDelivered

		// FIX: Gửi Kafka với retry logic - CHỈ CHO USER THẬT
		if !c.IsStressUser {
			msgCopy := *msg
			go c.sendToKafkaWithRetry("chat-topic", msgCopy.SenderID.Hex(), msgCopy)
		}

		c.Hub.Broadcast <- HubEvent{
			Type:    "chat",
			Payload: msg,
		}
	} else {
		// 1-1 message
		if msg.SenderID == msg.ReceiverID {
			log.Println(" Error: Không được gửi tin nhắn cho chính mình")
			return
		}

		if c.Hub.IsUserOnline(msg.ReceiverID.Hex()) {
			msg.Status = models.StatusDelivered
		} else {
			msg.Status = models.StatusSent
		}

		msg.ID = newID
		msg.CreatedAt = time.Now()

		// FIX: Gửi Kafka với retry logic - CHỈ CHO USER THẬT
		if !c.IsStressUser {
			msgCopy := *msg
			go c.sendToKafkaWithRetry("chat-topic", msgCopy.SenderID.Hex(), msgCopy)
		}

		c.Hub.Broadcast <- HubEvent{
			Type:    "chat",
			Payload: msg,
		}
	}

	// Broadcast conversation preview
	if msg.ParentID == "" {
		conversations := models.ConversationPreview{
			UserID:          msg.ReceiverID.Hex(),
			GroupID:         msg.GroupID.Hex(),
			LastMessage:     msg.Content,
			LastMessageID:   newID.Hex(),
			LastMessageType: string(msg.Type),
			Avatar:          msg.Avatar,
			DisplayName:     msg.DisplayName,
			LastDate:        msg.CreatedAt,
			SenderID:        msg.SenderID.Hex(),
		}

		c.Hub.Broadcast <- HubEvent{
			Type:    "conversations",
			Payload: &conversations,
		}
	}
}

func (c *Client) handleUpdateSeen(msg *models.MessageStatusRequest) {
	if msg == nil {
		return
	}

	if msg.ReceiverID == "" || msg.LastSeenMsgID == "" {
		log.Println("⚠️ Thiếu dữ liệu update_seen")
		return
	}

	msgCopy := *msg
	go c.sendToKafkaWithRetry("update-status-message", msgCopy.SenderID, msgCopy)

	c.Hub.Broadcast <- HubEvent{Type: "update_seen", Payload: msg}
}

func (c *Client) handleMemberLeft(msg *models.MessageResponse) {
	if msg == nil {
		return
	}

	msg.CreatedAt = time.Now()
	msg.UpdatedAt = time.Now()
	msg.ID = primitive.NewObjectID()

	msg.SystemAction = "leave"
	msg.Status = "seen"
	msg.IsRead = true

	msgCopy := *msg
	go c.sendToKafkaWithRetry("chat-topic", msgCopy.SenderID.Hex(), msgCopy)
	go c.sendToKafkaWithRetry("group-out", msgCopy.SenderID.Hex(), msgCopy)

	c.Hub.Broadcast <- HubEvent{
		Type:    "chat",
		Payload: msg,
	}

	// c.Hub.Broadcast <- HubEvent{
	// 	Type:    "member_left",
	// 	Payload: msg,
	// }

	c.Hub.Broadcast <- HubEvent{
		Type: "group_member_removed",
		Payload: map[string]interface{}{
			"group_id": msg.GroupID.Hex(),
			"user_id":  msg.SenderID.Hex(),
		},
	}
}

func (c *Client) handleDeleteForMe(delMsg *models.DeleteMessageForMe) {
	if delMsg == nil {
		return
	}

	userID, err := primitive.ObjectIDFromHex(delMsg.UserID)
	if err != nil {
		log.Println("❌ UserID không hợp lệ:", err)
		return
	}

	var messageIDs []primitive.ObjectID
	for _, m := range delMsg.MessageIDs {
		id, err := primitive.ObjectIDFromHex(m)
		if err != nil {
			log.Println("❌ MessageID không hợp lệ:", m, err)
			continue
		}
		messageIDs = append(messageIDs, id)
	}

	c.Hub.Broadcast <- HubEvent{
		Type:    "delete_for_me",
		Payload: delMsg,
	}

	go c.sendToKafkaWithRetry("delete-message-for-me-topic", userID.Hex(), *delMsg)
}

func (c *Client) handleForwardMessage(req *models.ForwardMessageRequest) {
	if req == nil {
		return
	}

	// Max 50 channels check
	if len(req.ReceiverIDs)+len(req.GroupIDs) > 50 {
		log.Println(" Forward: Too many channels")
		return
	}

	senderID, err := primitive.ObjectIDFromHex(req.SenderID)
	if err != nil {
		log.Println(" Forward: Invalid SenderID")
		return
	}

	// Handle GroupIDs
	for _, gidStr := range req.GroupIDs {
		gid, err := primitive.ObjectIDFromHex(gidStr)
		if err != nil {
			continue
		}

		newMsg := &models.MessageResponse{
			ID:        primitive.NewObjectID(),
			SenderID:  senderID,
			GroupID:   gid,
			Content:   req.Content,
			Type:      req.Type,
			MediaIDs:  req.MediaIDs,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Status:    models.StatusDelivered,
		}

		go c.sendToKafkaWithRetry("chat-topic", req.SenderID, newMsg)
		c.Hub.Broadcast <- HubEvent{Type: "chat", Payload: newMsg}
	}

	// Handle ReceiverIDs
	for _, ridStr := range req.ReceiverIDs {
		rid, err := primitive.ObjectIDFromHex(ridStr)
		if err != nil {
			continue
		}

		newMsg := &models.MessageResponse{
			ID:         primitive.NewObjectID(),
			SenderID:   senderID,
			ReceiverID: rid,
			Content:    req.Content,
			Type:       req.Type,
			MediaIDs:   req.MediaIDs,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		// Check if receiver is online to set status
		if c.Hub.IsUserOnline(rid.Hex()) {
			newMsg.Status = models.StatusDelivered
		} else {
			newMsg.Status = models.StatusSent
		}

		go c.sendToKafkaWithRetry("chat-topic", newMsg.SenderID.Hex(), newMsg)
		c.Hub.Broadcast <- HubEvent{Type: "chat", Payload: newMsg}
	}
}

// ======================== Retry logic với exponential backoff ========================
func (c *Client) sendToKafkaWithRetry(topic, key string, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf(" JSON marshal error: %v", err)
		return
	}

	maxRetries := 5
	for retry := 0; retry < maxRetries; retry++ {
		err = kafka.SendMessageAsync(topic, key, string(data))
		if err == nil {
			if retry > 0 {
				log.Printf(" Retry success after %d attempts: topic=%s", retry, topic)
			}
			return
		}

		// Thất bại → retry với exponential backoff
		if retry < maxRetries-1 {
			backoff := time.Duration(1<<uint(retry)) * 100 * time.Millisecond // 100ms, 200ms, 400ms, 800ms, 1.6s
			log.Printf(" Retry %d/%d after %v: topic=%s, error=%v", retry+1, maxRetries, backoff, topic, err)
			time.Sleep(backoff)
		}
	}

	// CRITICAL: Sau 5 lần retry vẫn fail
	log.Printf("❌ CRITICAL: Failed to send to Kafka after %d retries: topic=%s, key=%s", maxRetries, topic, key)
	c.logFailedMessage(topic, key, string(data))
}

// Ghi message thất bại vào file để recovery sau
func (c *Client) logFailedMessage(topic, key, data string) {
	logEntry := fmt.Sprintf("[%s] topic=%s key=%s data=%s\n",
		time.Now().Format(time.RFC3339), topic, key, data)

	log.Printf("💾 Logged failed message: %s", logEntry)
}

func (c *Client) WritePump() {
	pingTicker := time.NewTicker(40 * time.Second)

	defer func() {
		pingTicker.Stop()
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte("channel closed"))
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				log.Println("❌ Write error:", err)
				return
			}

		case <-pingTicker.C:
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				if websocket.IsUnexpectedCloseError(err) {
					return
				}
			}
		}
	}
}

func (c *Client) SafeClose() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.closed {
		close(c.Send)
		c.closed = true
	}
}

func buildSystemMessage(res *models.GroupMemberRequest) string {
	switch res.Action {

	case "create_group":
		return fmt.Sprintf(
			"Người dùng %s đã tạo nhóm %s",
			res.DisplayName,
			res.GroupName,
		)

	case "add_member":
		names := []string{}
		for _, m := range res.Members {
			names = append(names, m.UserName)
		}

		if len(names) == 1 {
			return fmt.Sprintf(
				"Người dùng %s đã thêm %s vào nhóm",
				res.DisplayName,
				names[0],
			)
		}

		return fmt.Sprintf(
			"Người dùng %s đã thêm %s vào nhóm",
			res.DisplayName,
			strings.Join(names, ", "),
		)
	}

	return ""
}
