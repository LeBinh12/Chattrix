package models

type UpdateTaskCommentRequest struct {
	Content string `json:"content" binding:"required"`
}

type ListTaskCommentsRequest struct {
	TaskID string `form:"task_id" binding:"required"`
	Page   int64  `form:"page"`
	Limit  int64  `form:"limit"`
}
