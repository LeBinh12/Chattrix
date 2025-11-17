package websocket

import (
	"encoding/json"
	"fmt"
	"log"
	"my-app/common/kafka"
	"my-app/modules/chat/models"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Đây là nơi xử lý Struct client, các method gửi/nhận tin

type Client struct {
	Hub       *Hub
	Conn      *websocket.Conn
	Send      chan []byte
	UserID    string
	SessionID string
	LastSeen  time.Time
	mu        sync.Mutex
	closed    bool
}

type WSMessage struct {
	Type          string                       `json:"type"` // "chat" | "update_seen"
	Message       *models.MessageResponse      `json:"message,omitempty"`
	MessageStatus *models.MessageStatusRequest `json:"message_status,omitempty"`
	DeleteMsg     *models.DeleteMessageForMe   `json:"delete_msg,omitempty"`
}

// ĐỌc dữ liệu lưu và DB và trả về cho client là đã gửi vào hub và hub sẽ xử lý gửi đi cho client
func (c *Client) ReadPump(db *mongo.Database) {
	defer func() {
		log.Println(" ReadPump đóng cho user:", c.UserID)
		c.Hub.Unregister <- c
		time.Sleep(200 * time.Millisecond)
		c.Conn.Close()
	}()

	// setup Ping-Pong
	c.Conn.SetReadLimit(1024 * 1024) // 1MB
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.LastSeen = time.Now()
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		log.Println(" Nhận được pong từ client:", c.UserID)
		return nil
	})

	for {
		var incoming WSMessage
		if err := c.Conn.ReadJSON(&incoming); err != nil {
			log.Println(" Read error:", err)
			break
		}

		switch incoming.Type {
		case "chat":
			msg := incoming.Message
			if msg == nil {
				continue
			}

			// xủ lý nếu là nhắn tin Group
			if msg.GroupID != primitive.NilObjectID {
				msg.CreatedAt = time.Now()
				msg.UpdatedAt = time.Now()
				msg.ID = primitive.NewObjectID()

				c.Hub.Broadcast <- HubEvent{
					Type:    "chat",
					Payload: msg,
				}
				msg.Status = models.StatusDelivered
			} else {
				if msg.SenderID == msg.ReceiverID {
					log.Println("Error: Không được gửi tin nhắn cho chính mình")
					break
				}

				// kiểm tra xem người dùng có ở trong soket không, nếu có thì là đang online
				_, ok := c.Hub.Clients[msg.ReceiverID.Hex()]

				if ok {
					msg.Status = models.StatusDelivered
				} else {
					msg.Status = models.StatusSent
				}

				msg.ID = primitive.NewObjectID()
				msg.CreatedAt = time.Now()
				// Gửi broadcast chat ra hub
				c.Hub.Broadcast <- HubEvent{
					Type:    "chat",
					Payload: msg,
				}
				// có thể serialize JSON thay vì chỉ Content
				// Broadcast Gửi một tin nhắn tới tất cả người nhận cùng lúc
				// Unicast là Gửi tin nhắn tới một người nhận riêng
				// 	Multicast là Gửi tin nhắn tới một nhóm người nhận
			}
			var conversations = models.ConversationPreview{
				UserID:          msg.ReceiverID.Hex(),
				GroupID:         msg.GroupID.Hex(),
				LastMessage:     msg.Content,
				LastMessageType: string(msg.Type),
				Avatar:          msg.Avatar,
				DisplayName:     msg.DisplayName,
				LastDate:        msg.CreatedAt,
				SenderID:        msg.SenderID.Hex(),
			}

			// gửi broadcast conversation ra hub

			c.Hub.Broadcast <- HubEvent{
				Type:    "conversations",
				Payload: &conversations,
			}

			msgCopy := msg
			go func() {
				data, err := json.Marshal(msg)

				if err != nil {
					log.Println("JSON marshal error:", err)
					return
				}

				// if err := kafka.SendMessage("chat-topic", msgCopy.SenderID.Hex(), string(data)); err != nil {
				// 	log.Println("Kafka send error:", err)
				// }
				kafka.EnqueueMessage("chat-topic", msgCopy.SenderID.Hex(), string(data))
			}()

		case "update_seen":

			msg := incoming.MessageStatus
			if msg == nil {
				continue
			}
			fmt.Println("duwx lieuj tra ve:", msg)

			if msg.ReceiverID == "" || msg.LastSeenMsgID == "" {
				log.Println(" Thiếu dữ liệu update_seen")
				continue
			}

			// Gửi broadcast lại cho những client khác

			c.Hub.Broadcast <- HubEvent{Type: "update_seen", Payload: msg}

			msgCopy := msg
			go func() {
				data, err := json.Marshal(msg)
				fmt.Println("duwx lieuj tra ve:", data)
				if err != nil {
					log.Println("JSON marshal error:", err)
					return
				}

				if err := kafka.SendMessage("update-status-message", msgCopy.SenderID, string(data)); err != nil {
					log.Println("Kafka send error:", err)
				}
			}()

			/// Xử lý thoát nhóm
		case "member_left":
			msg := incoming.Message
			if msg == nil {
				continue
			}

			c.Hub.Broadcast <- HubEvent{
				Type:    "chat",
				Payload: msg,
			}

			msgCopy := msg
			go func() {
				data, err := json.Marshal(msg)

				if err != nil {
					log.Println("JSON marshal error:", err)
					return
				}

				if err := kafka.SendMessage("chat-topic", msgCopy.SenderID.Hex(), string(data)); err != nil {
					log.Println("Kafka send error:", err)
				}
			}()

			go func() {
				data, err := json.Marshal(msg)

				if err != nil {
					log.Println("JSON marshal error:", err)
					return
				}
				if err := kafka.SendMessage("group-out", msgCopy.SenderID.Hex(), string(data)); err != nil {
					log.Println("Kafka send error:", err)
				}
			}()

		// xử lý xóa tin nhắn chỉ mình mình không thấy tin nhắn đó

		case "delete_for_me":
			delMsg := incoming.DeleteMsg
			if delMsg == nil {
				continue
			}
			// Convert UserID
			userID, err := primitive.ObjectIDFromHex(delMsg.UserID)
			if err != nil {
				log.Println("UserID không hợp lệ:", err)
				continue
			}

			// Convert MessageIDs
			var messageIDs []primitive.ObjectID
			for _, m := range delMsg.MessageIDs {
				id, err := primitive.ObjectIDFromHex(m)
				if err != nil {
					log.Println("MessageID không hợp lệ:", m, err)
					continue
				}
				messageIDs = append(messageIDs, id)
			}

			// Realtime: gửi event này về chính user (ẩn tin nhắn đó)
			c.Hub.Broadcast <- HubEvent{
				Type:    "delete_for_me",
				Payload: delMsg,
			}

			// Gửi lên Kafka để consumer xử lý lưu vào DB
			go func() {
				data, err := json.Marshal(delMsg)
				if err != nil {
					log.Println("JSON marshal error:", err)
					return
				}

				if err := kafka.SendMessage("delete-message-for-me-topic", userID.Hex(), string(data)); err != nil {
					log.Println("Kafka send error:", err)
				}
			}()

		}

	}
}

// Lắng nghe xem có ai gửi tin nhắn xuống không nếu có trả về cho client đoạn tinh nhắn đó
func (c *Client) WritePump() {
	// Thêm ticker để gửi ping định kỳ (ví dụ: 30 giây)
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
				// channel bị đóng và ngắt kết nối
				c.Conn.WriteMessage(1, []byte("channel closed"))
				return
			}

			// Gửi xuống client
			if err := c.Conn.WriteMessage(1, msg); err != nil {
				log.Println("Write error:", err)
				return
			}
		case <-pingTicker.C:
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				// Nếu là lỗi tạm thì bỏ qua, đừng đóng liền
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
