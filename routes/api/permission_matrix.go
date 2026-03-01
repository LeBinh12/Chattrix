package api

import (
	"my-app/middleware"
	"my-app/modules/permission/biz"
	ginMatrix "my-app/modules/permission_matrix/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterPermissionMatrixRoutes(rg *gin.RouterGroup, db *mongo.Database, permBiz *biz.PermissionBiz) {
	matrix := rg.Group("/permission-matrix")
	{
		matrix.GET("",
			middleware.RequirePermission("system:matrix:view", permBiz, db),
			ginMatrix.GetPermissionMatrixHandler(db))
		matrix.PUT("",
			middleware.RequirePermission("system:matrix:update", permBiz, db),
			ginMatrix.UpdatePermissionMatrixHandler(db))
	}
}
