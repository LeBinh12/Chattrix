package routes

import (
	"my-app/config"
	"my-app/middleware"
	"my-app/modules/chat/transport/websocket"
	"my-app/modules/permission/biz"
	"my-app/modules/permission/storage"
	"my-app/routes/api"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func InitRouter(r *gin.Engine, db *mongo.Database, hub *websocket.Hub, esClient *elasticsearch.Client, cfg config.AppConfig) {

	permStore := storage.NewMongoStore(db)
	permBiz := biz.NewPermissionBiz(permStore)
	v1 := r.Group("/v1")

	v1.Use(
		middleware.LoggerMiddleware(),
	)
	{
		api.RegisterUserRoutes(v1, db, permBiz)
	}

	v1Protected := r.Group("/v1")
	v1Protected.Use(
		middleware.LoggerMiddleware(),
		middleware.AuthMiddleware(),
	)
	{

		api.RegisterAdminRoutes(v1Protected, db, hub, permBiz)
		api.RegisterRoleRoutes(v1Protected, db, permBiz)
		api.RegisterPermissionRoutes(v1Protected, db, permBiz)
		api.RegisterModuleRoutes(v1Protected, db, permBiz)
		api.RegisterPermissionMatrixRoutes(v1Protected, db, permBiz)

		api.MessageRoutes(v1Protected, db, esClient)
		api.RegisterFriendRoutes(v1Protected, db)
		api.RegisterConversation(v1Protected, db)
		api.GroupRoutes(v1Protected, db, hub)
		api.RegisterUserStatusRoutes(v1Protected, db)
		api.RegisterTaskRoutes(v1Protected, db)
		api.RegisterVideoCallRoutes(v1Protected, cfg.LiveKit, hub, db)
	}

	v1NoMiddleware := r.Group("/v1")
	{
		api.RegisterChatRoutes(v1NoMiddleware, db, hub)
		// Load test routes — không cần auth để tiện gọi từ dashboard
		api.RegisterLoadTestRoutes(v1NoMiddleware, db)
	}

	v1Upload := r.Group("/v1")
	{
		api.UploadRoutes(v1Upload, db)
		api.RegisterStatisticalRoutes(v1Upload, db)
	}

}
