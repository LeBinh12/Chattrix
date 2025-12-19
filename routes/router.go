package routes

import (
	"my-app/middleware"
	"my-app/modules/chat/transport/websocket"
	"my-app/routes/api"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func InitRouter(r *gin.Engine, db *mongo.Database, hub *websocket.Hub, esClient *elasticsearch.Client) {
	v1 := r.Group("/v1")

	v1.Use(
		middleware.LoggerMiddleware(),
		// middleware.ApiKeyMiddleware(),
		// middleware.RateLimitingMiddleware(),
	)
	{
		api.RegisterUserRoutes(v1, db)
		api.RegisterAdminRoutes(v1, db)
	}

	v1.Use(
		middleware.LoggerMiddleware(),
		// middleware.ApiKeyMiddleware(),
		// middleware.RateLimitingMiddleware(),
		middleware.AuthMiddleware(),
	)
	{
		api.MessageRoutes(v1, db, esClient)
		api.RegisterFriendRoutes(v1, db)
		api.RegisterConversation(v1, db)
		api.GroupRoutes(v1, db)
		api.RegisterUserStatusRoutes(v1, db)

	}

	// Nhóm không có middleware (chat)
	// websocket
	v1NoMiddleware := r.Group("/v1")
	{

		api.RegisterChatRoutes(v1NoMiddleware, db, hub)
	}

	// Upload không có middleware
	v1Upload := r.Group("/v1")
	{
		api.UploadRoutes(v1Upload, db)
		api.RegisterStatisticalRoutes(v1Upload, db)
	}

}
