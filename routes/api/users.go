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
		users.POST("/register-oauth", middleware.AuthMiddleware(), ginUser.CompleteProfileHandler(db))
		users.POST("/login", ginUser.LoginHandler(db))
		users.POST("/login-open-dict", ginUser.OpenIddictCallbackHandler(db))
		users.POST("/google-login", ginUser.GoogleLoginHandler(db))
		users.GET("/status", ginUser.GetUserStatusHandler(db))
		users.POST("/upsert-setting", middleware.AuthMiddleware(),
			middleware.ApiKeyMiddleware(), ginUser.UpsertSettingHandler(db))
		users.GET("/get-setting", middleware.AuthMiddleware(),
			middleware.ApiKeyMiddleware(), ginUser.GetSettingHandler(db))

	}
}
