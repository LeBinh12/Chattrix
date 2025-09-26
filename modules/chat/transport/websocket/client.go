package websocket

import (
	"context"
	"log"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/mongo"
)

// Đây là nơi xử lý Struct client, các method gửi/nhận tin

type Client struct {
	Hub  *Hub
	Conn *websocket.Conn
	Send chan []byte
}

// ĐỌc dữ liệu lưu và DB và trả về cho client là đã gửi vào hub và hub sẽ xử lý gửi đi cho client
func (c *Client) ReadPump(db *mongo.Database) {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	chatStore := storage.NewMongoStore(db)
	chatBiz := biz.NewChatBiz(chatStore)

	for {
		var msg models.Message

		// Đọc JSON từ WebSocket
		if err := c.Conn.ReadJSON(&msg); err != nil {
			log.Println("Read error:", err)
			break
		}

		// Lưu DB

		// Gửi broadcast ra hub
		c.Hub.Broadcast <- []byte(msg.Content) // có thể serialize JSON thay vì chỉ Content
		// Broadcast Gửi một tin nhắn tới tất cả người nhận cùng lúc
		// Unicast là Gửi tin nhắn tới một người nhận riêng
		// 	Multicast là Gửi tin nhắn tới một nhóm người nhận

		msgCopy := msg
		go func() {
			if _, err := chatBiz.HandleMessage(context.Background(),
				msgCopy.SenderID, msgCopy.ReceiverID, msgCopy.Content); err != nil {
				log.Println("DB save error:", err)
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
