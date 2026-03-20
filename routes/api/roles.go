package api

import (
	"my-app/middleware"
	"my-app/modules/permission/biz"
	ginRole "my-app/modules/role/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterRoleRoutes(rg *gin.RouterGroup, db *mongo.Database, permBiz *biz.PermissionBiz) {
	roles := rg.Group("/roles")
	{
		roles.GET("",
			middleware.RequirePermission("system:role:view", permBiz, db),
			ginRole.ListRolesHandler(db))
		roles.GET("/:id",
			middleware.RequirePermission("system:role:view", permBiz, db),
			ginRole.GetRoleHandler(db))
		roles.POST("",
			middleware.RequirePermission("system:role:create", permBiz, db),
			ginRole.CreateRoleHandler(db))
		roles.PUT("/:id",
			middleware.RequirePermission("system:role:update", permBiz, db),
			ginRole.UpdateRoleHandler(db))
		roles.DELETE("/:id",
			middleware.RequirePermission("system:role:delete", permBiz, db),
			ginRole.DeleteRoleHandler(db))
	}
}
