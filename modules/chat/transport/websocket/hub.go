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

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Hub struct {
	DB         *mongo.Database
	Clients    map[string]map[string]*Client
	Broadcast  chan HubEvent
	Register   chan *Client
	Unregister chan *Client
}

type HubEvent struct {
	Type    string
	Payload interface{}
}

func NewHub(db *mongo.Database) *Hub {
	return &Hub{
		DB: db,

		Clients:    make(map[string]map[string]*Client),
		Broadcast:  make(chan HubEvent),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}
func (h *Hub) Run() {
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
				msg := event.Payload.(*models.MessageResponse)
				user, _ := StorageUser.NewMongoStore(h.DB).FindByID(context.Background(), msg.SenderID.Hex())
				msg.SenderAvatar = user.Avatar
				msg.SenderName = user.DisplayName
				data, _ := json.Marshal(map[string]interface{}{
					"type":    "chat",
					"message": msg,
				})

				// Nếu là nhắn nhóm
				// Nếu là nhắn nhóm
				if msg.GroupID != primitive.NilObjectID {
					members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), msg.GroupID)
					if err != nil {
						log.Println("Lỗi GetGroupMembers:", err)
						break
					}

					for _, memberID := range members {
						// Tạo conversation preview riêng cho từng member
						convPreview := &models.ConversationPreview{
							SenderID:        msg.SenderID.Hex(),
							GroupID:         msg.GroupID.Hex(),
							UserID:          "", // member nhận conversation
							LastMessage:     msg.Content,
							LastMessageID:   msg.ID.Hex(),
							LastMessageType: string(msg.Type),
							Avatar:          msg.Avatar,      // avatar nhóm
							DisplayName:     msg.DisplayName, // tên nhóm
							LastDate:        msg.CreatedAt,
							IsMuted:         msg.IsMuted,
						}

						dataConv, _ := json.Marshal(map[string]interface{}{
							"type":    "conversations",
							"message": convPreview,
						})

						if sessions, ok := h.Clients[memberID.Hex()]; ok {
							for _, c := range sessions {
								select {
								case c.Send <- dataConv:
								default:
									log.Printf("Buffer full — dropping conversation update for %s", memberID.Hex())
								}
							}
						}
					}

					// Gửi lại message thật cho tất cả (như trước)
					dataMsg, _ := json.Marshal(map[string]interface{}{
						"type":    "chat",
						"message": msg,
					})

					for _, memberID := range members {

						if sessions, ok := h.Clients[memberID.Hex()]; ok {
							for _, c := range sessions {
								select {
								case c.Send <- dataMsg:
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

				// Sau khi gửi xong message...
				senderPreview := &models.ConversationPreview{
					SenderID:        msg.SenderID.Hex(),
					UserID:          msg.ReceiverID.Hex(), // Người nhận
					LastMessage:     msg.Content,
					LastMessageID:   msg.ID.Hex(),
					LastMessageType: string(msg.Type),
					Avatar:          msg.Avatar,     // avatar của người nhận
					DisplayName:     msg.SenderName, // tên người nhận
					LastDate:        msg.CreatedAt,
					IsMuted:         msg.IsMuted,
				}

				receiverPreview := &models.ConversationPreview{
					SenderID:        msg.SenderID.Hex(),
					UserID:          msg.SenderID.Hex(), // Người gửi
					LastMessage:     msg.Content,
					LastMessageID:   msg.ID.Hex(),
					LastMessageType: string(msg.Type),
					Avatar:          msg.SenderAvatar, // avatar của người gửi
					DisplayName:     msg.SenderName,   // tên người gửi
					LastDate:        msg.CreatedAt,
				}

				// Serialize JSON
				senderDataConv, _ := json.Marshal(map[string]interface{}{
					"type":    "conversations",
					"message": senderPreview,
				})

				receiverDataConv, _ := json.Marshal(map[string]interface{}{
					"type":    "conversations",
					"message": receiverPreview,
				})

				// Gửi realtime riêng biệt
				if sessions, ok := h.Clients[msg.SenderID.Hex()]; ok {
					for _, c := range sessions {
						c.Send <- senderDataConv
					}
				}
				if sessions, ok := h.Clients[msg.ReceiverID.Hex()]; ok {
					for _, c := range sessions {
						c.Send <- receiverDataConv
					}
				}

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
					fmt.Println("uid", uid)
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

	// gửi tới tất cả client khác
	for _, sessions := range h.Clients {
		for _, c := range sessions {
			select {
			case c.Send <- data:
			default:
				log.Printf(" Buffer full — dropping status for %s", c.UserID)
			}
		}
	}

	// Lưu DB + Kafka
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
