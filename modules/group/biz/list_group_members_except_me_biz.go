package biz

import (
	"context"
	"my-app/modules/group/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ListGroupMembersExceptMeStorage interface {
	ListGroupMembersExceptMe(
		ctx context.Context,
		groupID primitive.ObjectID,
		userID primitive.ObjectID,
		page int,
		limit int,
		keyword string,
	) ([]models.GroupMemberDetail, int64, error)
}

type listGroupMembersExceptMeBiz struct {
	store ListGroupMembersExceptMeStorage
}

func NewListGroupMembersExceptMeBiz(
	store ListGroupMembersExceptMeStorage,
) *listGroupMembersExceptMeBiz {
	return &listGroupMembersExceptMeBiz{store: store}
}

func (biz *listGroupMembersExceptMeBiz) List(
	ctx context.Context,
	groupID primitive.ObjectID,
	userID primitive.ObjectID,
	page int,
	limit int,
	keyword string,
) ([]models.GroupMemberDetail, int64, error) {

	members, total, err := biz.store.ListGroupMembersExceptMe(ctx, groupID, userID, page, limit, keyword)
	if err != nil {
		return nil, total, err
	}

	return members, total, nil
}
