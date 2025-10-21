package api

import (
	ginMessage "my-app/modules/chat/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func UploadRoutes(rg *gin.RouterGroup, db *mongo.Database) {
	upload := rg.Group("/upload")
	{
		upload.POST("/media", ginMessage.UploadMediaHandler(db))
		upload.GET("/media/:objectName", ginMessage.GetMediaHandler())
	}
}
