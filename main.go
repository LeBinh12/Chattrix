package main

import (
	"my-app/database"
	"my-app/routes"
	"my-app/utils"

	"github.com/gin-gonic/gin"
)

func main() {
	todoColl := database.ConnectMongo()

	r := gin.Default()
	if err := utils.RegisterValidator(); err != nil {
		panic(err)
	}

	// Truyền collection xuống router
	routes.InitRouter(r, todoColl)

	r.Run("0.0.0.0:3000")
}
