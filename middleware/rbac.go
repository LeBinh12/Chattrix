package middleware

import (
	"log"
	"net/http"

	"my-app/modules/permission/biz"
	userStorage "my-app/modules/user/storage" 

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// RequirePermission tạo middleware kiểm tra quyền truy cập (Đã nâng cấp Auto-Fix Roles)
func RequirePermission(permissionCode string, permissionBiz *biz.PermissionBiz, db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		userID, _ := ctx.Get("userID")
		rolesInterface, exists := ctx.Get("roles")
		
		log.Printf("[DEBUG][RBAC] Stage 1 - Context Check: UserID=%v, RolesExist=%v", userID, exists)

		var roles []string
		if exists {
			switch v := rolesInterface.(type) {
			case []string:
				roles = v
			case []interface{}:
				for _, r := range v {
					if s, ok := r.(string); ok {
						roles = append(roles, s)
					}
				}
			}
		}

		
		if len(roles) == 0 && userID != nil && db != nil {
			if uidStr, ok := userID.(string); ok && uidStr != "" {
				log.Printf("[DEBUG][RBAC] 🔄 Roles empty in Token. Resolving from DB for User: %s", uidStr)
				
				uStore := userStorage.NewMongoStore(db)
				dbRoles, err := uStore.GetUserRoles(ctx.Request.Context(), uidStr)
				
				if err == nil && len(dbRoles) > 0 {
					roles = dbRoles
					log.Printf("[DEBUG][RBAC] ✅ Auto-fixed roles from DB: %v", roles)
				
					ctx.Set("roles", roles)
				} else {
					log.Printf("[DEBUG][RBAC] ❌ Database also has no roles for User %s", uidStr)
				}
			}
		}

		if len(roles) == 0 {
			
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":   "FORBIDDEN",
				"message": "Bạn không có quyền thực hiện thao tác này (Thiếu vai trò)",
			})
			ctx.Abort()
			return
		}

		
		hasPermission, err := permissionBiz.HasPermission(ctx.Request.Context(), roles, permissionCode)
		
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi thẩm định quyền"})
			ctx.Abort()
			return
		}

		if !hasPermission {
			
			ctx.JSON(http.StatusForbidden, gin.H{
				"error":   "FORBIDDEN",
				"message": "Bạn không có quyền: " + permissionCode,
			})
			ctx.Abort()
			return
		}

		
		ctx.Next()
	}
}
