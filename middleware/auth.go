package middleware

import (
	"my-app/common"
	"my-app/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authHeader := ctx.GetHeader("Authorization")

		if authHeader == "" {
			ctx.JSON(http.StatusUnauthorized, common.NewUnauthorized(nil, "Thiếu token", "missing token", "UNAUTHORIZED"))
			ctx.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")

		if len(parts) != 2 || parts[0] != "Bearer" {
			ctx.JSON(http.StatusUnauthorized, common.NewUnauthorized(nil, "Token không hợp lệ", "invalid token format", "UNAUTHORIZED"))
			ctx.Abort()
			return
		}

		claims, err := utils.ValidateJWT(parts[1])

		if err != nil {
			ctx.JSON(http.StatusUnauthorized, common.NewUnauthorized(err, "Token hết hạn hoặc không hợp lệ", err.Error(), "UNAUTHORIZED"))
			ctx.Abort()
			return
		}

		// Lưu UserID vào context
		ctx.Set("userID", claims.UserID)
		ctx.Next()
	}
}
