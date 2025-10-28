package biz

import (
	"context"
	"my-app/modules/group/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ListGroupsByUserStorage interface {
	ListGroupsByUser(ctx context.Context, userID primitive.ObjectID, limit int64, skip int64) ([]models.Group, error)
}

type listGroupsByUserBiz struct {
	store ListGroupsByUserStorage
}

func NewListGroupsByUserBiz(store ListGroupsByUserStorage) *listGroupsByUserBiz {
	return &listGroupsByUserBiz{store: store}
}

func (biz *listGroupsByUserBiz) List(ctx context.Context, userID primitive.ObjectID, page, pageSize int64) ([]models.Group, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}

	skip := (page - 1) * pageSize

	groups, err := biz.store.ListGroupsByUser(ctx, userID, pageSize, skip)
	if err != nil {
		return nil, err
	}

	return groups, nil
}
