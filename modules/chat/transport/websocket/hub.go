package websocket

import (
	"context"
	"encoding/json"
	"log"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
	StorageUser "my-app/modules/user/storage"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Hub struct {
	DB         *mongo.Database
	Clients    map[string]*Client
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

		Clients:    make(map[string]*Client),
		Broadcast:  make(chan HubEvent),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			// Nếu user đã có kết nối cũ => đóng kết nối cũ
			if oldClient, ok := h.Clients[client.UserID]; ok {
				log.Printf(" User %s đã có kết nối cũ, đóng kết nối cũ...", client.UserID)
				oldClient.Conn.Close()
				delete(h.Clients, client.UserID)
			}

			h.Clients[client.UserID] = client
			log.Printf(" User %s kết nối thành công", client.UserID)

		case client := <-h.Unregister:
			if _, ok := h.Clients[client.UserID]; ok {
				delete(h.Clients, client.UserID)
				client.SafeClose()
			}

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
				if msg.GroupID != primitive.NilObjectID {
					members, err := storage.NewMongoChatStore(h.DB).GetGroupMembers(context.Background(), msg.GroupID)
					if err != nil {
						log.Println(" Lỗi GetGroupMembers:", err)
						break
					}

					for _, memberID := range members {
						if memberID.Hex() == msg.SenderID.Hex() {
							continue
						}
						if c, ok := h.Clients[memberID.Hex()]; ok {
							select {
							case c.Send <- data:
							default:
								log.Printf("⚠️ Buffer full — dropping group message for %s\n", memberID.Hex())
							}
						}
					}
					// gửi lại cho người gửi xác nhận
					if sender, ok := h.Clients[msg.SenderID.Hex()]; ok {
						select {
						case sender.Send <- data:
						default:
							log.Printf("⚠️ Buffer full — dropping sender echo for %s\n", msg.SenderID.Hex())
						}
					}
					break
				}

				// Nếu là nhắn 1-1
				if receiver, ok := h.Clients[msg.ReceiverID.Hex()]; ok {
					select {
					case receiver.Send <- data:
					default:
						log.Printf("⚠️ Buffer full — dropping message for receiver %s\n", msg.ReceiverID.Hex())
					}
				}
				if sender, ok := h.Clients[msg.SenderID.Hex()]; ok {
					select {
					case sender.Send <- data:
					default:
						log.Printf("⚠️ Buffer full — dropping message for sender %s\n", msg.SenderID.Hex())
					}
				}

			case "update_seen":
				data, _ := json.Marshal(event.Payload)
				for _, c := range h.Clients {
					select {
					case c.Send <- data:
					default:
						log.Printf("⚠️ Buffer full — dropping update_seen for %s\n", c.UserID)
					}
				}
			}
		}
	}
}
