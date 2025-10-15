package websocket

import (
	"context"
	"encoding/json"
	"log"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"

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
			h.Clients[client.UserID] = client
		case client := <-h.Unregister:
			if _, ok := h.Clients[client.UserID]; ok {
				delete(h.Clients, client.UserID)
				close(client.Send)
			}

		case event := <-h.Broadcast:
			switch event.Type {
			case "chat":
				msg := event.Payload.(*models.Message)
				data, _ := json.Marshal(map[string]interface{}{
					"type":    "chat",
					"message": msg,
					"status":  msg.Status,
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
							c.Send <- data
						}
					}
					// gửi lại cho người gửi xác nhận
					if sender, ok := h.Clients[msg.SenderID.Hex()]; ok {
						sender.Send <- data
					}
					break
				}

				// Nếu là nhắn 1-1
				if receiver, ok := h.Clients[msg.ReceiverID.Hex()]; ok {
					receiver.Send <- data
				}
				if sender, ok := h.Clients[msg.SenderID.Hex()]; ok {
					sender.Send <- data
				}

			case "update_seen":
				data, _ := json.Marshal(event.Payload)
				for _, c := range h.Clients {
					c.Send <- data
				}
			}
		}
	}
}
