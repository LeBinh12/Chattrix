package app

import (
	"path/filepath"
	"strings"

	"my-app/config"
	"my-app/middleware"
	"my-app/modules/chat/transport/websocket"
	"my-app/routes"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func buildRouter(cfg config.AppConfig, db *mongo.Database, hub *websocket.Hub) *gin.Engine {
	router := gin.New()
	router.Use(
		gin.Logger(),
		gin.Recovery(),
		middleware.CORSMiddleware(),
	)

	routes.InitRouter(router, db, hub)

	if cfg.Static.AssetsDir != "" {
		router.Static("/assets", cfg.Static.AssetsDir)
	}

	if cfg.Static.LogoPath != "" {
		router.StaticFile("/vite.svg", cfg.Static.LogoPath)
	}

	if cfg.Static.RootDir != "" {
		indexFile := filepath.Join(cfg.Static.RootDir, "index.html")

		router.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path

			if strings.HasPrefix(path, "/v1/") {
				c.JSON(404, gin.H{"error": "API endpoint not found"})
				return
			}

			c.File(indexFile)
		})
	}

	return router
}
