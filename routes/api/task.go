package api

import (
	chattransport "my-app/modules/chat/transport"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterTaskRoutes(group *gin.RouterGroup, db *mongo.Database) {
	taskHandler := chattransport.NewTaskHandler(db)
	commentHandler := chattransport.NewTaskCommentHandler(db)

	// Task routes
	group.POST("/tasks", taskHandler.CreateTask)
	group.GET("/tasks", taskHandler.ListTasks)
	group.PATCH("/tasks/:id/status", taskHandler.UpdateTaskStatus)

	// Task comment routes
	group.POST("/task-comments", commentHandler.CreateComment)
	group.GET("/task-comments", commentHandler.ListComments)
	group.PATCH("/task-comments/:id", commentHandler.UpdateComment)
	group.DELETE("/task-comments/:id", commentHandler.DeleteComment)
}
