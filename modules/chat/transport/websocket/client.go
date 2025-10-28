package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"my-app/common/kafka"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
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
	Type       string                  `json:"type"` // "chat" | "update_seen"
	Message    *models.MessageResponse `json:"message,omitempty"`
	SenderID   string                  `json:"sender_id,omitempty"`
	ReceiverID string                  `json:"receiver_id,omitempty"`

	LastSeenMsgID string `json:"last_seen_message_id,omitempty"`
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

	ctx := context.Background()

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
				// Gửi broadcast ra hub
				c.Hub.Broadcast <- HubEvent{
					Type:    "chat",
					Payload: msg,
				} // có thể serialize JSON thay vì chỉ Content
				// Broadcast Gửi một tin nhắn tới tất cả người nhận cùng lúc
				// Unicast là Gửi tin nhắn tới một người nhận riêng
				// 	Multicast là Gửi tin nhắn tới một nhóm người nhận
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

		case "update_seen":
			if incoming.ReceiverID == "" || incoming.LastSeenMsgID == "" {
				log.Println(" Thiếu dữ liệu update_seen")
				continue
			}

			senderID, err1 := primitive.ObjectIDFromHex(incoming.SenderID)     // người gửi
			receiverID, err2 := primitive.ObjectIDFromHex(incoming.ReceiverID) // người nhận
			userID := senderID                                                 // ai là người đọc
			lastSeenMsgID, err3 := primitive.ObjectIDFromHex(incoming.LastSeenMsgID)

			if err1 != nil || err2 != nil || err3 != nil {
				log.Println(" ObjectID không hợp lệ:", err1, err2, err3)
				continue
			}

			conversationID := storage.GetConversationID(senderID, receiverID)

			seenStore := storage.NewMongoChatStore(db)
			// Cập nhật con trỏ đã xem trong bảng chat_seen_status
			if err := seenStore.CreateOrUpdate(ctx, userID, conversationID, lastSeenMsgID); err != nil {
				log.Println(" Lỗi update ChatSeenStatus:", err)
				continue
			}

			// Update message status = seen
			msgStore := storage.NewMongoChatStore(db)
			if err := msgStore.UpdateStatusSeen(ctx, senderID, receiverID, lastSeenMsgID); err != nil {
				log.Println(" Lỗi update Message seen:", err)
				continue
			}

			// Gửi broadcast lại cho những client khác
			seenEvent := map[string]interface{}{
				"type":                 "update_seen",
				"conversation_id":      conversationID,
				"last_seen_message_id": incoming.LastSeenMsgID,
				"user_id":              c.UserID,
			}
			data, _ := json.Marshal(seenEvent)
			c.Hub.Broadcast <- HubEvent{Type: "update_seen", Payload: data}

		case "member_left":
			msg := incoming.Message
			if msg == nil {
				continue
			}

			// 		các dữ liệu cần lấy về
			// 		{
			// 			"type":"member_left",
			// "message":{
			// 	"sender_id": "68ff98ada26dd8b5a9071920",
			// 	"group_id": "6900afa51b3786292fb358da",
			// 	"avatar":"...."
			// 	"content": "Người dùng 68ff98ada26dd8b5a9071920 đã thoát nhóm"
			//	"type": "out_group"
			// 			}
			// 		 			}

			fmt.Println("Thoát nhóm", msg)

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
				fmt.Println("Group:", string(data))
				if err := kafka.SendMessage("group-out", msgCopy.SenderID.Hex(), string(data)); err != nil {
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
