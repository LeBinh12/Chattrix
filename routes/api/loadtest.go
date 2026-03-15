package api

import (
	"my-app/modules/loadtest"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// RegisterLoadTestRoutes đăng ký các API endpoint cho load testing
func RegisterLoadTestRoutes(rg *gin.RouterGroup, db *mongo.Database) {
	loadtest.SetDB(db)

	lt := rg.Group("/load-test")
	{
		// New Fetch Users endpoint
		lt.POST("/users", loadtest.GetLoadTestUsers)
		// POST /v1/load-test/start - Bắt đầu một phiên test mới
		lt.POST("/start", loadtest.StartLoadTest)
		// POST /v1/load-test/stop - Dừng phiên test đang chạy
		lt.POST("/stop", loadtest.StopLoadTest)
		// GET /v1/load-test/stats - Stream metrics real-time qua SSE
		lt.GET("/stats", loadtest.GetStats)

		// New Stress Test endpoints
		lt.POST("/seed", loadtest.SeedStressUsers)
		lt.POST("/stress-start", loadtest.StartStressTest)
		lt.POST("/mass-connect", loadtest.StartMassConnection)
		lt.POST("/broadcast", loadtest.BroadcastMessage)
	}
}
