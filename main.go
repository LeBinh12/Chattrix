package main

import (
	"my-app/common/kafka"
	"my-app/config"
	"my-app/database"
	"my-app/modules/chat/transport/websocket"
	"my-app/routes"
	"my-app/utils"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {

	config.InitCloudinary()
	config.InitMinio()
	todoColl := database.ConnectMongo()

	// setup producer
	kafka.InitProducer([]string{"localhost:9092"})

	// tạo thêm 1 luồng để lắng nghe Topic
	go kafka.StartConsumer(
		[]string{"localhost:9092"},
		"chat-group",
		[]string{"chat-topic", "update-status-message", "user-status-topic", "group-out"},
		todoColl,
	)

	r := gin.Default()

	// Xử lý CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-API-Key"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	if err := utils.RegisterValidator(); err != nil {
		panic(err)
	}

	hub := websocket.NewHub(todoColl)
	go hub.Run()

	routes.InitRouter(r, todoColl, hub)

	r.Run("0.0.0.0:3000")
}
