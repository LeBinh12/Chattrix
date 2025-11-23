package api

import (
	ginMessage "my-app/modules/chat/transport/gin"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func MessageRoutes(rg *gin.RouterGroup, db *mongo.Database, esClient *elasticsearch.Client) {
	message := rg.Group("/message")
	{
		message.GET("/get-message", ginMessage.GetMessages(db))
		message.GET("/search", ginMessage.SearchMessages(esClient))
		message.GET("/get-message-by-id", ginMessage.GetMessageId(db))

	}
}
