package api

import (
	ginFriend "my-app/modules/friend/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterFriendRoutes(rg *gin.RouterGroup, db *mongo.Database) {
	friend := rg.Group("/friend")
	{
		friend.POST("/add", ginFriend.CreateFriendHandler(db))
		friend.GET("/relation", ginFriend.GetRelationHandler(db))
		friend.POST("/update-status", ginFriend.UpdateFriendStatusHandler(db))
		friend.GET("/suggestions", ginFriend.SuggestFriendHandler(db))
	}
}
