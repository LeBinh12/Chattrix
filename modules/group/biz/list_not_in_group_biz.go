package biz

import (
	"context"
	"my-app/modules/group/models"
	userModel "my-app/modules/user/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ListUsersNotInGroupStorage interface {
	ListUsersNotInGroup(ctx context.Context, groupID primitive.ObjectID, limit int64, skip int64) ([]userModel.User, error)
	ListAllGroupsWithStats(
		ctx context.Context,
		page int64,
		pageSize int64,
	) ([]models.GroupDetail, int64, error)
	ListGroupMembersWithUserInfo(ctx context.Context, groupID primitive.ObjectID, page, pageSize int64) ([]models.UserInfoInGroup, int64, error)
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

func (biz *listUsersNotInGroupBiz) ListAllGroups(ctx context.Context, page, pageSize int64) ([]models.GroupDetail, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}

	return biz.store.ListAllGroupsWithStats(ctx, page, pageSize)
}

func (biz *listUsersNotInGroupBiz) ListMembers(ctx context.Context, groupID primitive.ObjectID, page, pageSize int64) ([]models.UserInfoInGroup, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	return biz.store.ListGroupMembersWithUserInfo(ctx, groupID, page, pageSize)
}
