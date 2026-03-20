package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/chat/storage"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type DeleteTaskCommentBiz struct {
	commentStorage *storage.TaskCommentStorage
}

func NewDeleteTaskCommentBiz(commentStorage *storage.TaskCommentStorage) *DeleteTaskCommentBiz {
	return &DeleteTaskCommentBiz{commentStorage: commentStorage}
}

func (biz *DeleteTaskCommentBiz) DeleteComment(
	ctx context.Context,
	commentID string,
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

	// // If this is a reply, decrement parent's reply count
	// if comment.ParentCommentID != nil {
	// 	if err := biz.commentStorage.DecrementReplyCount(ctx, *comment.ParentCommentID); err != nil {
	// 		return common.ErrCannotUpdateEntity("parent comment", err)
	// 	}
	// }

	if err := biz.commentStorage.DeleteComment(ctx, commentObjID); err != nil {
		return common.ErrCannotDeleteEntity("task comment", err)
	}

	return nil
}
