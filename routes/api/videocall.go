package api

import (
	"my-app/config"
	"my-app/middleware"
	ginVideo "my-app/modules/videocall/transport/gin"


	"my-app/modules/chat/transport/websocket"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterVideoCallRoutes(rg *gin.RouterGroup, cfg config.LiveKitConfig, hub *websocket.Hub, db *mongo.Database) {
	video := rg.Group("/videocall")
	{
		video.POST("/token", middleware.AuthMiddleware(), ginVideo.GetCallTokenHandler(cfg, hub, db))
	}
}
