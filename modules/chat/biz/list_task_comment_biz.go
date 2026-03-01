package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ListTaskCommentBiz struct {
	commentStorage *storage.TaskCommentStorage
}

func NewListTaskCommentBiz(commentStorage *storage.TaskCommentStorage) *ListTaskCommentBiz {
	return &ListTaskCommentBiz{commentStorage: commentStorage}
}

func (biz *ListTaskCommentBiz) ListComments(
	ctx context.Context,
	taskID string,
	page, limit int64,
) ([]models.TaskComment, int64, error) {
	taskObjID, err := primitive.ObjectIDFromHex(taskID)
	if err != nil {
		return nil, 0, common.ErrInvalidRequest(err)
	}

	comments, err := biz.commentStorage.ListCommentsByTask(ctx, taskObjID, page, limit)
	if err != nil {
		return nil, 0, common.ErrCannotListEntity("task comments", err)
	}

	total, err := biz.commentStorage.CountCommentsByTask(ctx, taskObjID)
	if err != nil {
		return nil, 0, common.ErrCannotListEntity("task comments", err)
	}

	return comments, total, nil
}
