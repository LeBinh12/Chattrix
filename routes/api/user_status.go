package api

import (
	ginUser "my-app/modules/user/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterUserStatusRoutes(rg *gin.RouterGroup, db *mongo.Database) {
	users := rg.Group("/user-status")
	{
		users.GET("/status", ginUser.GetUserStatusHandler(db))
	}
}
