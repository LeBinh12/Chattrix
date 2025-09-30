package api

import (
	ginMessage "my-app/modules/chat/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func MessageRoutes(rg *gin.RouterGroup, db *mongo.Database) {
	message := rg.Group("/message")
	{
		message.GET("/get-message", ginMessage.GetMessages(db))
	}
}
