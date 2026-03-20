package transport

import (
	"net/http"

	"my-app/common"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

type TaskCommentHandler struct {
	db *mongo.Database
}

func NewTaskCommentHandler(db *mongo.Database) *TaskCommentHandler {
	return &TaskCommentHandler{db: db}
}

func (h *TaskCommentHandler) CreateComment(c *gin.Context) {
	var req models.CreateTaskCommentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.MustGet("userID").(string)

	commentStorage := storage.NewTaskCommentStorage(h.db)
	taskStorage := storage.NewTaskStorage(h.db)
	chatStorage := storage.NewMongoChatStore(h.db)

	bizInstance := biz.NewCreateTaskCommentBiz(commentStorage, taskStorage, chatStorage)

	comment, err := bizInstance.CreateComment(c.Request.Context(), &req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Thêm Comment thành công", comment))
}

func (h *TaskCommentHandler) ListComments(c *gin.Context) {
	var req models.ListTaskCommentsRequest

	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit <= 0 {
		req.Limit = 20
	}

	commentStorage := storage.NewTaskCommentStorage(h.db)
	bizInstance := biz.NewListTaskCommentBiz(commentStorage)

	comments, total, err := bizInstance.ListComments(c.Request.Context(), req.TaskID, req.Page, req.Limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Lấy danh sách Comment thành công", gin.H{
		"data":  comments,
		"total": total,
		"page":  req.Page,
		"limit": req.Limit,
	}))
}

func (h *TaskCommentHandler) UpdateComment(c *gin.Context) {
	var req models.UpdateTaskCommentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	commentID := c.Param("id")
	userID := c.MustGet("userID").(string)

	commentStorage := storage.NewTaskCommentStorage(h.db)
	bizInstance := biz.NewUpdateTaskCommentBiz(commentStorage)

	if err := bizInstance.UpdateComment(c.Request.Context(), commentID, &req, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Cập nhật Comment thành công", true))
}

func (h *TaskCommentHandler) DeleteComment(c *gin.Context) {
	commentID := c.Param("id")
	userID := c.MustGet("userID").(string)

	commentStorage := storage.NewTaskCommentStorage(h.db)
	bizInstance := biz.NewDeleteTaskCommentBiz(commentStorage)

	if err := bizInstance.DeleteComment(c.Request.Context(), commentID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Xóa Comment thành công", true))
}
