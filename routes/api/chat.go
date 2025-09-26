package api

import (
	"my-app/modules/chat/transport/websocket"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterChatRoutes(rg *gin.RouterGroup, db *mongo.Database, hub *websocket.Hub) {
	chat := rg.Group("/chat")
	chat.GET("/ws", websocket.WebSocketHandler(db, hub))
}
