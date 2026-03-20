package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"my-app/common/kafka"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
	ModelsUser "my-app/modules/user/models"
	StorageUser "my-app/modules/user/storage"
	"time"

	"sync"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Hub struct {
	DB         *mongo.Database
	Clients    map[string]map[string]*Client
	Broadcast  chan HubEvent
	Register   chan *Client
	Unregister chan *Client
	Cache      *sync.Map
}

type HubEvent struct {
	Type    string
	Payload interface{}
}

func NewHub(db *mongo.Database) *Hub {
	return &Hub{
		DB: db,

		Clients:    make(map[string]map[string]*Client),
		Broadcast:  make(chan HubEvent, 4096),
		Register:   make(chan *Client, 1024),
		Unregister: make(chan *Client, 1024),
		Cache:      &sync.Map{},
	}
}
func (h *Hub) Run() {
	log.Println("🚀 [Hub] Hub.Run is starting (Version: SSE-V3-FIX)")
	go h.CheckOfflineTimeout()

	for {
		select {
		case client := <-h.Register:
			if h.Clients[client.UserID] == nil {
				h.Clients[client.UserID] = make(map[string]*Client)
			}
			h.Clients[client.UserID][client.SessionID] = client
			client.LastSeen = time.Now()

			h.BroadcastUserStatus(client.UserID, "online")

		case client := <-h.Unregister:
			sessions := h.Clients[client.UserID]
			delete(sessions, client.SessionID)

			// Nếu user hết session -> offline
			if len(sessions) == 0 {
				h.BroadcastUserStatus(client.UserID, "offline")
				delete(h.Clients, client.UserID)
			}

			client.SafeClose()

		case event := <-h.Broadcast:
			switch event.Type {
			case "chat":
				msg, ok := event.Payload.(*models.MessageResponse)
				if !ok || msg == nil {
					log.Println("⚠️ [Hub] Received invalid chat payload in Broadcast")
					continue
				}

				// FIX: Đưa toàn bộ xử lý DB và Broadcast ra goroutine riêng để tránh nghẽn Hub
				go h.broadcastChatMessage(msg)
				continue
			case "update_seen":
				msg := event.Payload.(*models.MessageStatusRequest)
				data, _ := json.Marshal(map[string]interface{}{
					"type":    "update_seen",
					"message": msg,
				})
				// Chỉ gửi cho receiver
				if sessions, ok := h.Clients[msg.ReceiverID]; ok {
					fmt.Println("data_Rêciver", msg)
					for _, c := range sessions {
						select {
						case c.Send <- data:
						default:
							log.Printf("Buffer full — dropping update_seen for %s\n", c.UserID)
						}
					}
				}

				if sessions, ok := h.Clients[msg.SenderID]; ok {
					fmt.Println("SenderID", msg)
					for _, c := range sessions {
						select {
						case c.Send <- data:
						default:
							log.Printf("Buffer full — dropping update_seen for %s\n", c.UserID)
						}
					}
				}

				// xử lý gửi về client chính mình khi xóa tin nhắn
			case "delete_for_me":
				payload := event.Payload.(*models.DeleteMessageForMe)

				if sessions, ok := h.Clients[payload.UserID]; ok {
					data, _ := json.Marshal(map[string]interface{}{
						"type":    "delete_for_me",
						"message": payload,
					})

					for _, c := range sessions {
						select {
						case c.Send <- data:
						default:
							log.Printf("Buffer full — dropping delete_for_me for %s", payload.UserID)
						}
					}
				}

			case "edit_message_update":
				payload := event.Payload.(map[string]interface{})
				data, _ := json.Marshal(map[string]interface{}{
					"type":    "edit_message_update",
					"payload": payload,
				})

				groupIDStr, _ := payload["group_id"].(string)
				receiverIDStr, _ := payload["receiver_id"].(string)
				senderIDStr, _ := payload["sender_id"].(string)

				// Nếu là nhắn nhóm
				if groupIDStr != "" && groupIDStr != "000000000000000000000000" {
					groupID, _ := primitive.ObjectIDFromHex(groupIDStr)
					members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), groupID)
					if err == nil {
						for _, memberID := range members {
							if sessions, ok := h.Clients[memberID.Hex()]; ok {
								for _, c := range sessions {
									c.Send <- data
								}
							}
						}
					}
				} else {
					// Nếu là nhắn 1-1
					if sessions, ok := h.Clients[receiverIDStr]; ok {
						for _, c := range sessions {
							c.Send <- data
						}
					}
					if sessions, ok := h.Clients[senderIDStr]; ok {
						for _, c := range sessions {
							c.Send <- data
						}
					}
				}

			case "recall-message":
				msg := event.Payload.(*models.MessageResponse)
				data, _ := json.Marshal(map[string]interface{}{
					"type":    "recall-message",
					"message": msg,
				})

				// Nếu là nhắn nhóm
				if msg.GroupID != primitive.NilObjectID {
					members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), msg.GroupID)
					if err != nil {
						log.Println("Lỗi GetGroupMembers:", err)
						break
					}

					for _, memberID := range members {

						if sessions, ok := h.Clients[memberID.Hex()]; ok {
							for _, c := range sessions {
								select {
								case c.Send <- data:
								default:
									log.Printf("Buffer full — dropping chat for %s", memberID.Hex())
								}
							}
						}
					}

					break
				}

				// Nếu là nhắn 1-1
				if sessions, ok := h.Clients[msg.ReceiverID.Hex()]; ok {
					for _, receiver := range sessions {
						select {
						case receiver.Send <- data:
						default:
							log.Printf(" Buffer full — dropping message for receiver %s", msg.ReceiverID.Hex())
						}
					}
				}

				if sessions, ok := h.Clients[msg.SenderID.Hex()]; ok {
					for _, sender := range sessions {
						select {
						case sender.Send <- data:
						default:
							log.Printf(" Buffer full — dropping message for sender %s", msg.SenderID.Hex())
						}
					}
				}

			case "pinned-message":
				resSocket := event.Payload.(*models.MessageResponseSocket)

				dataRecall, _ := json.Marshal(map[string]interface{}{
					"type":    "pinned-message",
					"message": resSocket,
				})
				// Nếu là nhắn nhóm
				if resSocket.GroupID != primitive.NilObjectID {
					members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), resSocket.GroupID)
					if err != nil {
						log.Println("Lỗi GetGroupMembers:", err)
						break
					}

					for _, memberID := range members {

						if sessions, ok := h.Clients[memberID.Hex()]; ok {
							for _, c := range sessions {
								// Gửi type recall-message
								select {
								case c.Send <- dataRecall:
								default:
									log.Printf("Buffer full — dropping recall for %s", memberID.Hex())
								}
							}
						}
					}

					break
				}

				senderOID, _ := primitive.ObjectIDFromHex(resSocket.SenderID)
				receiverOID, _ := primitive.ObjectIDFromHex(resSocket.ReceiverID)

				users := []primitive.ObjectID{senderOID, receiverOID} // Nếu là nhắn 1-1

				for _, uid := range users {
					if sessions, ok := h.Clients[uid.Hex()]; ok {
						for _, c := range sessions {
							// Gửi type recall-message
							select {
							case c.Send <- dataRecall:
							default:
								log.Printf("Buffer full — dropping recall for %s", uid.Hex())
							}
						}
					}
				}

			case "un-pinned-message":
				resSocket := event.Payload.(*models.MessageResponseSocket)

				dataRecall, _ := json.Marshal(map[string]interface{}{
					"type":    "un-pinned-message",
					"message": resSocket,
				})
				// Nếu là nhắn nhóm
				if resSocket.GroupID != primitive.NilObjectID {
					members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), resSocket.GroupID)
					if err != nil {
						log.Println("Lỗi GetGroupMembers:", err)
						break
					}

					for _, memberID := range members {

						if sessions, ok := h.Clients[memberID.Hex()]; ok {
							for _, c := range sessions {
								// Gửi type recall-message
								select {
								case c.Send <- dataRecall:
								default:
									log.Printf("Buffer full — dropping recall for %s", memberID.Hex())
								}
							}
						}
					}

					break
				}

				senderOID, _ := primitive.ObjectIDFromHex(resSocket.SenderID)
				receiverOID, _ := primitive.ObjectIDFromHex(resSocket.ReceiverID)

				users := []primitive.ObjectID{senderOID, receiverOID} // Nếu là nhắn 1-1

				for _, uid := range users {
					if sessions, ok := h.Clients[uid.Hex()]; ok {
						for _, c := range sessions {
							// Gửi type recall-message
							select {
							case c.Send <- dataRecall:
							default:
								log.Printf("Buffer full — dropping recall for %s", uid.Hex())
							}
						}
					}
				}

			case "rep-task":
				resSocket := event.Payload.(*models.MessageResponse)

				dataRecall, _ := json.Marshal(map[string]interface{}{
					"type":    "rep-task",
					"message": resSocket,
				})
				// Nếu là nhắn nhóm
				if resSocket.GroupID != primitive.NilObjectID {
					members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), resSocket.GroupID)
					if err != nil {
						log.Println("Lỗi GetGroupMembers:", err)
						break
					}

					for _, memberID := range members {

						if sessions, ok := h.Clients[memberID.Hex()]; ok {
							for _, c := range sessions {
								// Gửi type recall-message
								select {
								case c.Send <- dataRecall:
								default:
									log.Printf("Buffer full — dropping recall for %s", memberID.Hex())
								}
							}
						}
					}

					break
				}

				users := []primitive.ObjectID{resSocket.SenderID, resSocket.ReceiverID} // Nếu là nhắn 1-1

				for _, uid := range users {
					if sessions, ok := h.Clients[uid.Hex()]; ok {
						for _, c := range sessions {
							// Gửi type recall-message
							select {
							case c.Send <- dataRecall:
							default:
								log.Printf("Buffer full — dropping recall for %s", uid.Hex())
							}
						}
					}
				}

			case "chat-notification":
				resSocket := event.Payload.(*models.MessageNotificationResponse)

				if resSocket == nil {
					log.Println("[chat-notification] Payload is nil")
					break
				}

				// Chuẩn bị message chính - hiển thị như tin nhắn chat bình thường
				dataMsg, err := json.Marshal(map[string]interface{}{
					"type":    "chat",
					"message": resSocket,
				})
				if err != nil {
					log.Printf("[chat-notification] Marshal chat message error: %v", err)
					break
				}

				// Đếm số user nhận được để log chính xác
				broadcastCount := 0

				// Duyệt qua tất cả client đang online
				for userID, sessions := range h.Clients {
					if sessions == nil {
						continue
					}

					for _, client := range sessions {
						// 1. Gửi tin nhắn chính (hiển thị trong khung chat)
						select {
						case client.Send <- dataMsg:
							// thành công
						default:
							log.Printf("Buffer full — dropping chat-notification message for user %s", userID)
							continue // thử client tiếp theo
						}

						// 2. Tạo và gửi conversation preview riêng cho user này
						convPreview := &models.ConversationPreview{
							SenderID:        resSocket.SenderID.Hex(),
							UserID:          userID, // quan trọng: user này thấy conversation với kênh hệ thống
							LastMessage:     resSocket.Content,
							LastMessageID:   resSocket.ID.Hex(),
							LastMessageType: string(resSocket.Type),
							Avatar:          resSocket.SenderAvatar,
							DisplayName:     resSocket.SenderName,
							LastDate:        resSocket.CreatedAt,
							// Có thể thêm: UnreadCount: 1, IsMuted: false,...
						}

						dataConv, err := json.Marshal(map[string]interface{}{
							"type":    "conversations",
							"message": convPreview,
						})
						if err != nil {
							log.Printf("[chat-notification] Marshal conversation preview error for user %s: %v", userID, err)
							continue
						}

						select {
						case client.Send <- dataConv:
							broadcastCount++
						default:
							log.Printf("Buffer full — dropping conversation preview for user %s", userID)
						}
					}
				}

				// Log chính xác số lượng user thực tế nhận được
				log.Printf("[chat-notification] Successfully broadcast to %d online users (from channel %s)", broadcastCount, resSocket.SenderID.Hex())
			case "group_member_added":
				payload := event.Payload.(map[string]interface{})
				members := payload["members"].([]models.Member)
				data, _ := json.Marshal(map[string]interface{}{
					"type":    "group_member_added",
					"message": payload,
				})

				senderID := ""
				if sid, ok := payload["sender_id"].(string); ok {
					senderID = sid
				}

				if sessions, ok := h.Clients[senderID]; ok {
					fmt.Println("uid", senderID)

					for _, c := range sessions {
						select {
						case c.Send <- data:
						default:
							log.Println("buffer full, dropping message for", senderID)
						}
					}
				}

				for _, mem := range members {
					uid := mem.UserID.Hex()
					// Nếu user đang online → gửi realtime
					if sessions, ok := h.Clients[uid]; ok {

						for _, c := range sessions {
							select {
							case c.Send <- data:
							default:
								log.Println("buffer full, dropping message for", uid)
							}
						}
					}
				}

			case "member_left":
				resSocket := event.Payload.(*models.MessageResponse)

				dataRecall, _ := json.Marshal(map[string]interface{}{
					"type":    "member_left",
					"message": resSocket,
				})
				// Nếu là nhắn nhóm
				if resSocket.GroupID != primitive.NilObjectID {
					members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), resSocket.GroupID)
					if err != nil {
						log.Println("Lỗi GetGroupMembers:", err)
						break
					}

					for _, memberID := range members {

						if sessions, ok := h.Clients[memberID.Hex()]; ok {
							for _, c := range sessions {
								// Gửi type recall-message
								select {
								case c.Send <- dataRecall:
								default:
									log.Printf("Buffer full — dropping recall for %s", memberID.Hex())
								}
							}
						}
					}
				}
				break
			case "account_deleted":
				deletedUserID := event.Payload.(string)
				data, _ := json.Marshal(map[string]interface{}{
					"type":    "account_deleted",
					"message": "Tài khoản của bạn đã bị xóa khỏi hệ thống.",
				})

				if sessions, ok := h.Clients[deletedUserID]; ok {
					for _, c := range sessions {
						select {
						case c.Send <- data:
						default:
						}
						// Ta không close ngay lập tức để client nhận được message
					}
				}
			case "task_comment":
				resSocket := event.Payload.(*models.TaskComment)

				dataRecall, _ := json.Marshal(map[string]interface{}{
					"type":    "task_comment",
					"message": resSocket,
				})
				// Nếu là nhắn nhóm
				if resSocket.GroupID != primitive.NilObjectID {
					members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), resSocket.GroupID)
					if err != nil {
						log.Println("Lỗi GetGroupMembers:", err)
						break
					}

					for _, memberID := range members {

						if sessions, ok := h.Clients[memberID.Hex()]; ok {
							for _, c := range sessions {
								// Gửi type recall-message
								select {
								case c.Send <- dataRecall:
								default:
									log.Printf("Buffer full — dropping recall for %s", memberID.Hex())
								}
							}
						}
					}

					break
				}

				users := []primitive.ObjectID{resSocket.SenderID, resSocket.ReceiverID} // Nếu là nhắn 1-1

				for _, uid := range users {
					if sessions, ok := h.Clients[uid.Hex()]; ok {
						for _, c := range sessions {
							// Gửi type recall-message
							select {
							case c.Send <- dataRecall:
							default:
								log.Printf("Buffer full — dropping recall for %s", uid.Hex())
							}
						}
					}
				}

			case "reaction_update":
				payload := event.Payload.(*models.ReactionEvent)
				data, _ := json.Marshal(map[string]interface{}{
					"type":    "reaction_update",
					"message": payload,
				})

				// Send to Group
				if payload.GroupID != primitive.NilObjectID {
					members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), payload.GroupID)
					if err != nil {
						log.Println("Lỗi GetGroupMembers reaction:", err)
						break
					}

					for _, memberID := range members {
						if sessions, ok := h.Clients[memberID.Hex()]; ok {
							for _, c := range sessions {
								select {
								case c.Send <- data:
								default:
								}
							}
						}
					}
				} else {
					// Send to 1-1 (Sender & Receiver)
					// Note: payload.UserID is the reactor.
					// payload.MessageSenderID is who sent message.
					// payload.ReceiverID is the other person in 1-1.

					// Logic: Broadcast to MessageSenderID AND ReceiverID.
					// Why? Because in 1-1, these are the two participants.

					recipients := []string{payload.MessageSenderID.Hex(), payload.ReceiverID.Hex()}
					// Dedup just in case
					if payload.MessageSenderID == payload.ReceiverID {
						recipients = []string{payload.MessageSenderID.Hex()}
					}

					for _, uid := range recipients {
						if sessions, ok := h.Clients[uid]; ok {
							for _, c := range sessions {
								select {
								case c.Send <- data:
								default:
								}
							}
						}
					}
				}

			case "video-call":
				log.Println("[Hub] Received video-call event") // DEBUG
				payload := event.Payload.(map[string]interface{})
				log.Printf("[Hub] Payload: %+v\n", payload) // DEBUG
				data, _ := json.Marshal(map[string]interface{}{
					"type":    "video-call",
					"message": payload,
				})

				ctx := context.Background()

				// Handle Group Call
				if groupID, ok := payload["group_id"].(string); ok && groupID != "" {
					log.Printf("[Hub] Broadcasting group call to group: %s\n", groupID) // DEBUG
					oid, err := primitive.ObjectIDFromHex(groupID)
					if err == nil {
						members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(ctx, oid)
						if err == nil {
							for _, memberID := range members {
								if sessions, ok := h.Clients[memberID.Hex()]; ok {
									for _, c := range sessions {
										select {
										case c.Send <- data:
										default:
											log.Printf("Buffer full — dropping video-call for %s", memberID.Hex())
										}
									}
								}
							}
						}
					}
				}

				// Handle DM Call (User to User)
				if receiverID, ok := payload["receiver_id"].(string); ok && receiverID != "" {
					log.Printf("[Hub] Processing DM call for receiver: %s\n", receiverID) // DEBUG
					// Send to Receiver
					if sessions, ok := h.Clients[receiverID]; ok {
						log.Printf("[Hub] Receiver %s is ONLINE. Sending socket message.\n", receiverID) // DEBUG
						for _, c := range sessions {
							select {
							case c.Send <- data:
							default:
								log.Printf("Buffer full — dropping video-call for %s", receiverID)
							}
						}
					} else {
						log.Printf("[Hub] Receiver %s is OFFLINE (not in h.Clients).\n", receiverID) // DEBUG
					}
					// Send to Sender (Caller) - though they likely know, it keeps state in sync
					if callerID, ok := payload["caller_id"].(string); ok && callerID != "" {
						if sessions, ok := h.Clients[callerID]; ok {
							for _, c := range sessions {
								select {
								case c.Send <- data:
								default:
									log.Printf("Buffer full — dropping video-call for %s", callerID)
								}
							}
						}
					}
				}
			case "group_dissolved":
				payload := event.Payload.(map[string]interface{})
				groupIDStr := payload["group_id"].(string)

				var members []primitive.ObjectID
				if mIDs, ok := payload["member_ids"].([]primitive.ObjectID); ok {
					members = mIDs
				} else {
					groupID, err := primitive.ObjectIDFromHex(groupIDStr)
					if err != nil {
						log.Println("Lỗi group_id không hợp lệ trong group_dissolved:", groupIDStr)
						break
					}
					members, err = storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), groupID)
					if err != nil {
						log.Println("Lỗi GetGroupMembers trong group_dissolved:", err)
						break
					}
				}

				data, _ := json.Marshal(map[string]interface{}{
					"type":    "group_dissolved",
					"payload": payload,
				})

				for _, memberID := range members {
					if sessions, ok := h.Clients[memberID.Hex()]; ok {
						for _, c := range sessions {
							select {
							case c.Send <- data:
							default:
								log.Printf("Buffer full — dropping group_dissolved for %s", memberID.Hex())
							}
						}
					}
				}

			case "group_member_removed":
				payload := event.Payload.(map[string]interface{})
				targetUserID := payload["user_id"].(string)
				data, _ := json.Marshal(map[string]interface{}{
					"type":    "group_member_removed",
					"message": payload,
				})

				if sessions, ok := h.Clients[targetUserID]; ok {
					for _, c := range sessions {
						select {
						case c.Send <- data:
						default:
							log.Printf("Buffer full — dropping group_member_removed for %s", targetUserID)
						}
					}
				}
			}
		}
	}
}

func (h *Hub) BroadcastUserStatus(userID, status string) {
	oid, _ := primitive.ObjectIDFromHex(userID)
	event := ModelsUser.UserStatus{
		UserID:    oid,
		Status:    status,
		UpdatedAt: time.Now(),
	}
	data, _ := json.Marshal(event)

	// Kiểm tra nếu là stress user thì không broadcast (tiết kiệm CPU O(N^2))
	isStress := false
	if sessions, ok := h.Clients[userID]; ok {
		for _, c := range sessions {
			if c.IsStressUser {
				isStress = true
				break
			}
		}
	}
	if isStress {
		return
	}

	// gửi tới tất cả client khác - nhưng bỏ qua stress users (họ không cần xem status)
	for _, sessions := range h.Clients {
		for _, c := range sessions {
			if c.IsStressUser {
				continue
			}
			select {
			case c.Send <- data:
			default:
				// Buffer full
			}
		}
	}

	// Lưu DB + Kafka - CHỈ CHO USER THẬT
	kafka.SendMessageAsync("user-status-topic", userID, string(data))
}

func (h *Hub) CheckOfflineTimeout() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		for userID, sessions := range h.Clients {
			for sessionID, c := range sessions {
				if now.Sub(c.LastSeen) > 60*time.Second {
					log.Printf("User %s session %s timeout, đánh offline", userID, sessionID)
					h.Unregister <- c
				}
			}
		}
	}
}

func (h *Hub) broadcastChatMessage(msg *models.MessageResponse) {
	if h.DB != nil {
		// 1. Caching: Tránh query DB liên tục mỗi tin nhắn
		cacheKey := "user:" + msg.SenderID.Hex()
		if cached, ok := h.Cache.Load(cacheKey); ok {
			user := cached.(*ModelsUser.User)
			msg.SenderAvatar = user.Avatar
			msg.SenderName = user.DisplayName
		} else {
			user, _ := StorageUser.NewMongoStore(h.DB).FindByID(context.Background(), msg.SenderID.Hex())
			if user != nil {
				msg.SenderAvatar = user.Avatar
				msg.SenderName = user.DisplayName
				h.Cache.Store(cacheKey, user)
			}
		}

		if msg.GroupID != primitive.NilObjectID && (msg.DisplayName == "" || msg.Avatar == "") {
			gCacheKey := "group:" + msg.GroupID.Hex()
			if cached, ok := h.Cache.Load(gCacheKey); ok {
				group := cached.(struct {
					Name  string
					Image string
				})
				msg.DisplayName = group.Name
				msg.Avatar = group.Image
			} else {
				var group struct {
					Name  string `bson:"name"`
					Image string `bson:"image"`
				}
				err := h.DB.Collection("group").FindOne(context.Background(), bson.M{"_id": msg.GroupID}).Decode(&group)
				if err == nil {
					msg.DisplayName = group.Name
					msg.Avatar = group.Image
					h.Cache.Store(gCacheKey, group)
				}
			}
		}
	}

	data, _ := json.Marshal(map[string]interface{}{
		"type":    "chat",
		"message": msg,
	})

	// 2. Broadcast logic (Nhóm hoặc 1-1)
	if msg.GroupID != primitive.NilObjectID {
		members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), msg.GroupID)
		if err != nil {
			log.Println("Lỗi GetGroupMembers:", err)
			return
		}

		// Realtime preview (chỉ cho tin nhắn mới)
		if msg.ParentID == "" {
			for _, mID := range members {
				preview := &models.ConversationPreview{
					SenderID:        msg.SenderID.Hex(),
					GroupID:         msg.GroupID.Hex(),
					LastMessage:     msg.Content,
					LastMessageID:   msg.ID.Hex(),
					LastMessageType: string(msg.Type),
					Avatar:          msg.Avatar,
					DisplayName:     msg.DisplayName,
					LastDate:        msg.CreatedAt,
				}
				pData, _ := json.Marshal(map[string]interface{}{"type": "conversations", "message": preview})
				h.sendToUser(mID.Hex(), pData)
			}
		}

		// Gửi message thật
		for _, mID := range members {
			h.sendToUser(mID.Hex(), data)
		}
	} else {
		// Nhắn 1-1
		h.sendToUser(msg.ReceiverID.Hex(), data)
		h.sendToUser(msg.SenderID.Hex(), data)

		if msg.ParentID == "" {
			// Sender's preview (viewing the receiver)
			sPreview := &models.ConversationPreview{
				SenderID:        msg.SenderID.Hex(),
				UserID:          msg.ReceiverID.Hex(),
				LastMessage:     msg.Content,
				LastMessageID:   msg.ID.Hex(),
				LastMessageType: string(msg.Type),
				Avatar:          msg.Avatar,
				DisplayName:     msg.SenderName,
				LastDate:        msg.CreatedAt,
			}
			sData, _ := json.Marshal(map[string]interface{}{"type": "conversations", "message": sPreview})
			h.sendToUser(msg.SenderID.Hex(), sData)

			// Receiver's preview (viewing the sender)
			rPreview := &models.ConversationPreview{
				SenderID:        msg.SenderID.Hex(),
				UserID:          msg.SenderID.Hex(),
				LastMessage:     msg.Content,
				LastMessageID:   msg.ID.Hex(),
				LastMessageType: string(msg.Type),
				Avatar:          msg.SenderAvatar,
				DisplayName:     msg.SenderName,
				LastDate:        msg.CreatedAt,
			}
			rData, _ := json.Marshal(map[string]interface{}{"type": "conversations", "message": rPreview})
			h.sendToUser(msg.ReceiverID.Hex(), rData)
		}
	}
}

func (h *Hub) sendToUser(userID string, data []byte) {
	if sessions, ok := h.Clients[userID]; ok {
		for _, c := range sessions {
			select {
			case c.Send <- data:
			default:
				// Buffer full
			}
		}
	}
}
