package biz

import (
	"context"
	"fmt"
	"my-app/modules/group/models"
)

type CreateGroupMemberStorage interface {
	CreateGroupNumber(ctx context.Context, data *models.GroupMember) error
}

type createGroupMemberBiz struct {
	store CreateGroupMemberStorage
}

func NewCreateGroupMemberBiz(store CreateGroupMemberStorage) *createGroupMemberBiz {
	return &createGroupMemberBiz{store: store}
}

func (biz *createGroupMemberBiz) CreateGroupNumber(ctx context.Context, data *models.GroupMember) error {
	// logic kiểm tra hợp lệ
	if data.GroupID.IsZero() || data.UserID.IsZero() {
		return fmt.Errorf("Lỗi dữ liệu không hợp lệ")
	}

	if err := biz.store.CreateGroupNumber(ctx, data); err != nil {
		return err
	}

	return nil

}
