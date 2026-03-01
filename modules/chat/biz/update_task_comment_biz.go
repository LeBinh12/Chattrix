package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type UpdateTaskCommentBiz struct {
	commentStorage *storage.TaskCommentStorage
}

func NewUpdateTaskCommentBiz(commentStorage *storage.TaskCommentStorage) *UpdateTaskCommentBiz {
	return &UpdateTaskCommentBiz{commentStorage: commentStorage}
}

func (biz *UpdateTaskCommentBiz) UpdateComment(
	ctx context.Context,
	commentID string,
	req *models.UpdateTaskCommentRequest,
	userID string,
) error {
	commentObjID, err := primitive.ObjectIDFromHex(commentID)
	if err != nil {
		return common.ErrInvalidRequest(err)
	}

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return common.ErrInvalidRequest(err)
	}

	// Get comment to verify ownership
	comment, err := biz.commentStorage.GetComment(ctx, commentObjID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return common.ErrEntityNotFound("task comment", nil)
		}
		return common.ErrCannotGetEntity("task comment", err)
	}

	// Check if user is the owner
	if comment.UserID != userObjID {
		return common.ErrNoPermission(nil)
	}

	if err := biz.commentStorage.UpdateCommentContent(ctx, commentObjID, req.Content); err != nil {
		return common.ErrCannotUpdateEntity("task comment", err)
	}

	return nil
}
