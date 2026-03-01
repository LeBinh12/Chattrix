package biz

import (
	"context"
	"errors"
	"my-app/modules/group/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DissolveGroupStorage interface {
	GetGroup(ctx context.Context, groupID primitive.ObjectID) (*models.Group, error)
	DissolveGroup(ctx context.Context, groupID primitive.ObjectID) error
}

type dissolveGroupBiz struct {
	store DissolveGroupStorage
}

func NewDissolveGroupBiz(store DissolveGroupStorage) *dissolveGroupBiz {
	return &dissolveGroupBiz{store: store}
}

func (biz *dissolveGroupBiz) DissolveGroup(ctx context.Context, requesterIDStr string, groupIDStr string) (string, error) {
	groupID, err := primitive.ObjectIDFromHex(groupIDStr)
	if err != nil {
		return "", errors.New("group_id không hợp lệ")
	}

	requesterID, err := primitive.ObjectIDFromHex(requesterIDStr)
	if err != nil {
		return "", errors.New("requester_id không hợp lệ")
	}

	// 1. Get Group info
	group, err := biz.store.GetGroup(ctx, groupID)
	if err != nil {
		return "", errors.New("không tìm thấy nhóm")
	}

	// 2. Check if requester is the creator
	if group.CreatorID != requesterID {
		return "", errors.New("chỉ có nhóm trưởng mới có quyền giải tán nhóm")
	}

	// 3. Dissolve group
	if err := biz.store.DissolveGroup(ctx, groupID); err != nil {
		return "", err
	}

	return group.Name, nil
}
