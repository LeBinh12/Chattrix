package api

import (
	"my-app/middleware"
	"my-app/modules/chat/transport/websocket"
	ginGroup "my-app/modules/group/transport/gin"
	"my-app/modules/permission/biz"
	ginRole "my-app/modules/role/transport/gin"
	ginUser "my-app/modules/user/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterAdminRoutes(rg *gin.RouterGroup, db *mongo.Database, hub *websocket.Hub, permBiz *biz.PermissionBiz) {
	admin := rg.Group("/admin")
	{
		// Kiểm tra quyền truy cập admin panel
		admin.Use(middleware.RequirePermission("system:admin:access_admin_panel", permBiz, db))

		// Quản lý người dùng
		admin.GET("/get-pagination",
			middleware.RequirePermission("system:user:view_all", permBiz, db),
			ginUser.ListUsersWithStatusHandler(db))

		// Quản lý nhóm
		admin.GET("/get-group",
			middleware.RequirePermission("system:group:view_all", permBiz, db),
			ginGroup.ListAllGroupsWithStatsHandler(db))
		admin.GET("/get-number-group",
			middleware.RequirePermission("system:group:view_all", permBiz, db),
			ginGroup.ListGroupMembersWithUserHandler(db))

		// Thao tác trên người dùng
		admin.DELETE("/user/:id",
			middleware.RequirePermission("system:user:delete", permBiz, db),
			ginUser.SoftDeleteUserHandler(db, hub))
		admin.PATCH("/user/:id",
			middleware.RequirePermission("system:user:update_global", permBiz, db),
			ginUser.AdminUpdateUserHandler(db))
		admin.POST("/user/:id/reset-password",
			middleware.RequirePermission("system:user:reset_password", permBiz, db),
			ginUser.AdminResetPasswordHandler(db))

		// Lấy danh sách role cho form chỉnh sửa user (không cần system:role:view)
		admin.GET("/roles-for-update",
			middleware.RequirePermission("system:user:update_global", permBiz, db),
			ginRole.GetRolesForUpdateHandler(db))
	}
}
