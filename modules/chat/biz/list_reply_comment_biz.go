package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ListReplyCommentBiz struct {
	commentStorage *storage.TaskCommentStorage
}

func NewListReplyCommentBiz(commentStorage *storage.TaskCommentStorage) *ListReplyCommentBiz {
	return &ListReplyCommentBiz{commentStorage: commentStorage}
}

func (biz *ListReplyCommentBiz) ListReplies(
	ctx context.Context,
	parentCommentID string,
	page, limit int64,
) ([]models.TaskComment, int64, error) {
	parentObjID, err := primitive.ObjectIDFromHex(parentCommentID)
	if err != nil {
		return nil, 0, common.ErrInvalidRequest(err)
	}

	replies, err := biz.commentStorage.ListRepliesByComment(ctx, parentObjID, page, limit)
	if err != nil {
		return nil, 0, common.ErrCannotListEntity("replies", err)
	}

	total, err := biz.commentStorage.CountRepliesByComment(ctx, parentObjID)
	if err != nil {
		return nil, 0, common.ErrCannotListEntity("replies", err)
	}

	return replies, total, nil
}
