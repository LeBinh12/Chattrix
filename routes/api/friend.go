package api

import (
	ginUser "my-app/modules/user/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterFriendRoutes(rg *gin.RouterGroup, db *mongo.Database) {
	friend := rg.Group("/friend")
	{
		friend.POST("/add", ginUser.CreateFriendHandler(db))
		friend.POST("/un-block", ginUser.UnBlockFriendHandler(db))
	}
}
