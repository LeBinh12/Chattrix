package middleware

import (
	"my-app/common"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func ApiKeyMiddleware() gin.HandlerFunc {
	expectedKey := os.Getenv("API_KEY")

	if expectedKey == "" {
		expectedKey = "becfce45-9237-4c6d-a7c5-f3be786249a5"
	}

	return func(ctx *gin.Context) {
		apiKey := ctx.GetHeader("X-API-Key")
		if apiKey == "" {
			ctx.AbortWithStatusJSON(http.StatusBadRequest, common.ErrApiKey)
			return
		}

		if apiKey != expectedKey {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, common.ErrApiKey)
			return
		}
		ctx.Next()
	}
}
