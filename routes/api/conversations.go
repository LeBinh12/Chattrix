package api

import (
	ginMessage "my-app/modules/chat/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterConversation(rg *gin.RouterGroup, db *mongo.Database) {
	friend := rg.Group("/conversations")
	{
		friend.GET("/list", ginMessage.ConversationsHandler(db))
	}
}
