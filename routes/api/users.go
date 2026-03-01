package api

import (
	cleanUser "my-app/internal/adapter/http/user"
	"my-app/middleware"
	"my-app/modules/permission/biz"
	ginUser "my-app/modules/user/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterUserRoutes(rg *gin.RouterGroup, db *mongo.Database, permBiz *biz.PermissionBiz) {
	users := rg.Group("/users")
	{
		// public route (ko can auth)

		users.POST("/login", cleanUser.LoginHandler(db))
		users.POST("/login-open-dict", ginUser.OpenIddictCallbackHandler(db))
		users.POST("/google-login", ginUser.GoogleLoginHandler(db))

		users.GET("/profile", middleware.AuthMiddleware(), ginUser.ProfileHandler(db))
		// tao moi ng dung dung api dang ki
		users.POST("/register", middleware.AuthMiddleware(), middleware.RequirePermission("system:user:create", permBiz, db), ginUser.RegisterHandler(db))
		users.PATCH("/update-profile", middleware.AuthMiddleware(), ginUser.UpdateProfileHandler(db))
		users.PATCH("/change-password", middleware.AuthMiddleware(), ginUser.ChangePasswordHandler(db))

		users.POST("/register-notification", ginUser.RegisterChanelNotificationHandler(db))
		users.POST("/register-oauth", middleware.AuthMiddleware(), ginUser.CompleteProfileHandler(db))

		users.GET("/status", ginUser.GetUserStatusHandler(db))
		users.POST("/upsert-setting", middleware.AuthMiddleware(),
			middleware.ApiKeyMiddleware(), ginUser.UpsertSettingHandler(db))

		users.GET("/get-setting", middleware.AuthMiddleware(),
			middleware.ApiKeyMiddleware(),
			//  middleware.RequirePermission("system:setting:view", permBiz, db),
			ginUser.GetSettingHandler(db))

		users.GET("/get-pagination",
			middleware.AuthMiddleware(),
			middleware.RequirePermission("system:user:view_all", permBiz, db),
			ginUser.ListUsersWithStatusHandler(db),
		)

	}
}
