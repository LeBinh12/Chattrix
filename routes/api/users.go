package api

import (
	"my-app/middleware"
	ginUser "my-app/modules/user/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterUserRoutes(rg *gin.RouterGroup, db *mongo.Database) {
	users := rg.Group("/users")
	{
		users.GET("/profile", middleware.AuthMiddleware(), ginUser.ProfileHandler(db))
		users.POST("/register", ginUser.RegisterHandler(db))
		users.POST("/login", ginUser.LoginHandler(db))
	}
}
