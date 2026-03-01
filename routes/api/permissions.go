package api

import (
	"my-app/middleware"
	"my-app/modules/permission/biz"
	ginPermission "my-app/modules/permission/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterPermissionRoutes(rg *gin.RouterGroup, db *mongo.Database, permBiz *biz.PermissionBiz) {
	permissions := rg.Group("/permissions")
	{
		permissions.GET("",
			middleware.RequirePermission("system:permission:view", permBiz, db),
			ginPermission.ListPermissionsHandler(db))
		permissions.GET("/:id",
			middleware.RequirePermission("system:permission:view", permBiz, db),
			ginPermission.GetPermissionHandler(db))
		permissions.POST("",
			middleware.RequirePermission("system:permission:create", permBiz, db),
			ginPermission.CreatePermissionHandler(db))
		permissions.PUT("/:id",
			middleware.RequirePermission("system:permission:update", permBiz, db),
			ginPermission.UpdatePermissionHandler(db))
		permissions.DELETE("/:id",
			middleware.RequirePermission("system:permission:delete", permBiz, db),
			ginPermission.DeletePermissionHandler(db))
	}
}
