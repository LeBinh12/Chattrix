package routes

import (
	"my-app/middleware"
	"my-app/modules/chat/transport/websocket"
	"my-app/routes/api"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func InitRouter(r *gin.Engine, todoColl *mongo.Database) {
	v1 := r.Group("/v1")
	v1.Use(
		middleware.LoggerMiddleware(),
		middleware.ApiKeyMiddleware(),
		middleware.RateLimitingMiddleware(),
	)
	{
		api.RegisterUserRoutes(v1, todoColl)
	}

	v1.Use(
		middleware.LoggerMiddleware(),
		middleware.ApiKeyMiddleware(),
		middleware.RateLimitingMiddleware(),
		middleware.AuthMiddleware(),
	)
	{
		api.MessageRoutes(v1, todoColl)
		api.RegisterFriendRoutes(v1, todoColl)
	}

	// Nhóm không có middleware (chat)
	v1NoMiddleware := r.Group("/v1")
	{
		hub := websocket.NewHub()
		go hub.Run()
		api.RegisterChatRoutes(v1NoMiddleware, todoColl, hub)
	}

}
