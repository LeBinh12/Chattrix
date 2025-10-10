package websocket

import (
	"encoding/json"
	"my-app/modules/chat/models"
)

type Hub struct {
	Clients    map[string]*Client
	Broadcast  chan HubEvent
	Register   chan *Client
	Unregister chan *Client
}

type HubEvent struct {
	Type    string
	Payload interface{}
}

func NewHub() *Hub {
	return &Hub{
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

				// Gửi cho người nhận nếu online
				if receiver, ok := h.Clients[msg.ReceiverID.Hex()]; ok {
					receiver.Send <- data
				}

				// Gửi lại cho người gửi (để đồng bộ trạng thái hoặc confirm gửi thành công)
				if sender, ok := h.Clients[msg.SenderID.Hex()]; ok {
					sender.Send <- data
				}
			case "update_seen":
				data, _ := json.Marshal(event.Payload)
				// Gửi cho tất cả client (hoặc lọc theo conversation_id)
				for _, c := range h.Clients {
					c.Send <- data
				}
			}

		}
	}
}
