package api

import (
	statisticalgin "my-app/modules/chat/transport/gin/statistical_gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterStatisticalRoutes(rg *gin.RouterGroup, db *mongo.Database) {
	upload := rg.Group("/statistical")
	{
		upload.GET("/count-today-message", statisticalgin.ConversationsHandler(db))

	}
}
