package api

import (
	ginMessage "my-app/modules/chat/transport/gin"

	"github.com/gin-gonic/gin"
)

func UploadRoutes(rg *gin.RouterGroup) {
	upload := rg.Group("/upload")
	{
		upload.POST("/media", ginMessage.UploadMediaHandler())
		upload.GET("/media/:objectName", ginMessage.GetMediaHandler())
	}
}
