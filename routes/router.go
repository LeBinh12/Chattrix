package routes

import (
	"my-app/middleware"
	"my-app/modules/chat/transport/websocket"
	"my-app/routes/api"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func InitRouter(r *gin.Engine, todoColl *mongo.Database, hub *websocket.Hub) {
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
		// middleware.ApiKeyMiddleware(),
		// middleware.RateLimitingMiddleware(),
		middleware.AuthMiddleware(),
	)
	{
		api.MessageRoutes(v1, todoColl)
		api.RegisterFriendRoutes(v1, todoColl)
		api.RegisterConversation(v1, todoColl)
		api.GroupRoutes(v1, todoColl)
		api.RegisterUserStatusRoutes(v1, todoColl)

	}

	// Nhóm không có middleware (chat)
	// websocket
	v1NoMiddleware := r.Group("/v1")
	{

		api.RegisterChatRoutes(v1NoMiddleware, todoColl, hub)
	}

	// Upload không có middleware
	v1Upload := r.Group("v1")
	{
		api.UploadRoutes(v1Upload, todoColl)
		api.RegisterStatisticalRoutes(v1Upload, todoColl)
	}

}
