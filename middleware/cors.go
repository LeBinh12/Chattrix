package middleware

import (
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORSMiddleware configures allowed origins/headers so the SPA can call APIs without browser errors.
func CORSMiddleware() gin.HandlerFunc {
	cfg := cors.Config{
		AllowOrigins:     parseAllowedOrigins(),
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-API-KEY"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}

	return cors.New(cfg)
}

func parseAllowedOrigins() []string {
	origins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if origins == "" {
		return []string{"*"}
	}

	fields := strings.Split(origins, ",")
	var trimmed []string
	for _, o := range fields {
		if v := strings.TrimSpace(o); v != "" {
			trimmed = append(trimmed, v)
		}
	}

	if len(trimmed) == 0 {
		return []string{"*"}
	}

	return trimmed
}
