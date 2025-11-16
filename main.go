package main

import (
	"my-app/common/kafka"
	"my-app/config"
	"my-app/database"
	"my-app/middleware"
	"my-app/modules/chat/transport/websocket"
	"my-app/routes"
	"my-app/utils"

	"github.com/gin-gonic/gin"
)

func main() {
	config.InitCloudinary()
	config.InitMinio()
	todoColl := database.ConnectMongo()

	// Kafka
	kafka.InitProducer([]string{"localhost:9092"})
	go kafka.StartConsumer(
		[]string{"localhost:9092"},
		"chat-group",
		[]string{"chat-topic", "update-status-message", "user-status-topic", "group-out", "delete-message-for-me-topic"},
		todoColl,
	)

	r := gin.Default()
	r.Use(middleware.CORSMiddleware())

	if err := utils.RegisterValidator(); err != nil {
		panic(err)
	}

	// WebSocket
	hub := websocket.NewHub(todoColl)
	go hub.Run()

	// API routes
	routes.InitRouter(r, todoColl, hub)

	// Serve static files từ thư mục dist
	r.Static("/assets", "./website/dist/assets")
	r.StaticFile("/vite.svg", "./website/dist/vite.svg")

	// SPA fallback
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Tránh conflict với API
		if len(path) >= 4 && path[:4] == "/v1/" {
			c.JSON(404, gin.H{"error": "API endpoint not found"})
			return
		}

		// Serve index.html cho tất cả routes khác
		c.File("./website/dist/index.html")
	})

	r.Run("0.0.0.0:3000")
}
