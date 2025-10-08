package websocket

import (
	"my-app/modules/chat/models"
)

type Hub struct {
	Clients    map[string]*Client
	Broadcast  chan models.Message
	Register   chan *Client
	Unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[string]*Client),
		Broadcast:  make(chan models.Message),
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
		case message := <-h.Broadcast:

			if receiver, ok := h.Clients[message.ReceiverID.Hex()]; ok {
				select {
				case receiver.Send <- []byte(message.Content):
				default:
					close(receiver.Send)
					delete(h.Clients, receiver.UserID)
				}
			}
		}
	}
}
