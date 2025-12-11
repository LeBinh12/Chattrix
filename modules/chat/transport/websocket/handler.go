package websocket

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/mongo"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func WebSocketHandler(db *mongo.Database, hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Query("id")

		if userID == "" {
			c.JSON(400, gin.H{"error": "missing id"})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		// để mặc kịch thước channel là 256 thì khi nhiều tin nhắn quá sẽ bị tràn làm mất dữ liệu
		client := &Client{Hub: hub, Conn: conn, Send: make(chan []byte, 256), UserID: userID}
		hub.Register <- client

		// goroutine xử lý đọc / ghi
		go client.ReadPump(db)
		go client.WritePump()
	}
}
