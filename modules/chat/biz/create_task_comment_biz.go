package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CreateTaskCommentBiz struct {
	commentStorage *storage.TaskCommentStorage
	taskStorage    *storage.TaskStorage
	chatStorage    *storage.MongoChatStore
}

func NewCreateTaskCommentBiz(
	commentStorage *storage.TaskCommentStorage,
	taskStorage *storage.TaskStorage,
	chatStorage *storage.MongoChatStore,
) *CreateTaskCommentBiz {
	return &CreateTaskCommentBiz{
		commentStorage: commentStorage,
		taskStorage:    taskStorage,
		chatStorage:    chatStorage,
	}
}

func (biz *CreateTaskCommentBiz) CreateComment(
	ctx context.Context,
	req *models.CreateTaskCommentRequest,
	userID string,
) (*models.TaskComment, error) {
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, common.ErrInvalidRequest(err)
	}

	// Verify task exists
	task, err := biz.taskStorage.GetTask(ctx, req.TaskID)
	if err != nil {
		return nil, common.ErrCannotGetEntity("task", err)
	}

	if task == nil {
		return nil, common.ErrEntityNotFound("task", nil)
	}

	// Get user info
	user, err := biz.chatStorage.GetUserById(ctx, userObjID)
	if err != nil {
		return nil, common.ErrCannotGetEntity("user", err)
	}

	comment := &models.TaskComment{
		TaskID:        req.TaskID,
		UserID:        userObjID,
		UserName:      user.DisplayName,
		UserAvatar:    user.Avatar,
		Content:       req.Content,
		AttachmentIDs: req.AttachmentIDs,
		ReplyToID:     req.ReplyToID,
		ReplyToUserID: req.ReplyToUserID,
		ReplyToAvatar: req.ReplyToAvatar,
		ReplyContent:  req.ReplyContent,
		ReplyUsername: req.ReplyUsername,
	}

	comment.ID = primitive.NewObjectID()
	comment.CreatedAt = time.Now()
	comment.UpdatedAt = time.Now()

	if err := biz.commentStorage.CreateComment(ctx, comment); err != nil {
		return nil, common.ErrCannotCreateEntity("task comment", err)
	}

	return comment, nil
}
