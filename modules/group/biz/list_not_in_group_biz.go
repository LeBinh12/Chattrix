package biz

import (
	"context"
	userModel "my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ListUsersNotInGroupStorage interface {
	ListUsersNotInGroup(ctx context.Context, groupID primitive.ObjectID, limit int64, skip int64) ([]userModel.User, error)
}

type listUsersNotInGroupBiz struct {
	store ListUsersNotInGroupStorage
}

func NewListUsersNotInGroupBiz(store ListUsersNotInGroupStorage) *listUsersNotInGroupBiz {
	return &listUsersNotInGroupBiz{store: store}
}

func (biz *listUsersNotInGroupBiz) List(ctx context.Context, groupID primitive.ObjectID, page, pageSize int64) ([]userModel.User, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}

	skip := (page - 1) * pageSize

	users, err := biz.store.ListUsersNotInGroup(ctx, groupID, pageSize, skip)
	if err != nil {
		return nil, err
	}

	return users, nil
}
