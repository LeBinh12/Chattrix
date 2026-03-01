package api

import (
	"my-app/middleware"
	"my-app/modules/permission/biz"
	ginModule "my-app/modules/permission_module/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterModuleRoutes(rg *gin.RouterGroup, db *mongo.Database, permBiz *biz.PermissionBiz) {
	modules := rg.Group("/modules")
	{
		modules.GET("",
			middleware.RequirePermission("system:module:view", permBiz, db),
			ginModule.ListModulesHandler(db))
		modules.GET("/:id",
			middleware.RequirePermission("system:module:view", permBiz, db),
			ginModule.GetModuleHandler(db))
		modules.POST("",
			middleware.RequirePermission("system:module:create", permBiz, db),
			ginModule.CreateModuleHandler(db))
		modules.PUT("/:id",
			middleware.RequirePermission("system:module:update", permBiz, db),
			ginModule.UpdateModuleHandler(db))
		modules.DELETE("/:id",
			middleware.RequirePermission("system:module:delete", permBiz, db),
			ginModule.DeleteModuleHandler(db))
	}
}
