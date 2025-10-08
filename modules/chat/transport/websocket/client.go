package websocket

import (
	"encoding/json"
	"log"
	"my-app/common/kafka"
	"my-app/modules/chat/models"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/mongo"
)

// Đây là nơi xử lý Struct client, các method gửi/nhận tin

type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	UserID string
}

// ĐỌc dữ liệu lưu và DB và trả về cho client là đã gửi vào hub và hub sẽ xử lý gửi đi cho client
func (c *Client) ReadPump(db *mongo.Database) {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		var msg models.Message

		// Đọc JSON từ WebSocket
		if err := c.Conn.ReadJSON(&msg); err != nil {
			log.Println("Read error:", err)
			break
		}

		if msg.SenderID == msg.ReceiverID {
			log.Println("Error: Không được gửi tin nhắn cho chính mình")
			break
		}

		// Gửi broadcast ra hub
		c.Hub.Broadcast <- msg // có thể serialize JSON thay vì chỉ Content
		// Broadcast Gửi một tin nhắn tới tất cả người nhận cùng lúc
		// Unicast là Gửi tin nhắn tới một người nhận riêng
		// 	Multicast là Gửi tin nhắn tới một nhóm người nhận

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
	}
}

// Lắng nghe xem có ai gửi tin nhắn xuống không nếu có trả về cho client đoạn tinh nhắn đó
func (c *Client) WritePump() {
	defer func() {
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
		}
	}
}
