package transport

import (
	"fmt"
	"net/http"

	"my-app/modules/chat/biz"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

type TaskHandler struct {
	db *mongo.Database
}

func NewTaskHandler(db *mongo.Database) *TaskHandler {
	return &TaskHandler{db: db}
}

func (h *TaskHandler) CreateTask(c *gin.Context) {
	var req models.CreateTaskRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	// Validate: phải có ít nhất 1 người nhận
	if len(req.Assignees) == 0 && req.AssigneeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Phải có ít nhất một người được giao"})
		return
	}

	userID := c.MustGet("userID").(string)

	taskStore := storage.NewTaskStorage(h.db)
	msgStore := storage.NewMongoChatStore(h.db)
	bizInstance := biz.NewCreateTaskBiz(taskStore, msgStore)

	tasks, err := bizInstance.CreateTasksBulk(c.Request.Context(), &req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	// Tính số người thực sự được giao việc
	count := len(tasks)
	if count == 1 && len(tasks[0].Assignees) > 0 {
		// Group task: 1 document nhưng nhiều assignee
		count = len(tasks[0].Assignees)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    tasks,
		"message": fmt.Sprintf("Đã giao việc thành công cho %d người", count),
	})
}

func (h *TaskHandler) UpdateTaskStatus(c *gin.Context) {
	var req models.UpdateTaskStatusRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	taskID := c.Param("id")
	userID := c.MustGet("userID").(string)

	taskStore := storage.NewTaskStorage(h.db)
	commentStore := storage.NewTaskCommentStorage(h.db)
	chatStore := storage.NewMongoChatStore(h.db)

	biz := biz.NewUpdateTaskBiz(taskStore, commentStore, chatStore)

	comment, err := biz.UpdateTaskStatus(c.Request.Context(), taskID, userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"status":  req.Status,
		"comment": comment,
	})
}

func (h *TaskHandler) ListTasks(c *gin.Context) {
	filterType := c.Query("type") // "assigned_to_me" or "assigned_by_me"
	userID := c.MustGet("userID").(string)

	taskStore := storage.NewTaskStorage(h.db)
	biz := biz.NewListTaskBiz(taskStore)

	tasks, err := biz.ListTasks(c.Request.Context(), userID, filterType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": tasks})
}
