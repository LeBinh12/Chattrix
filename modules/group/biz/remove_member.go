package biz

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Interface storage cho việc remove member
type RemoveGroupMemberStorage interface {
	RemoveMember(ctx context.Context, groupID, userID primitive.ObjectID) error
}

// Biz struct
type removeGroupMemberBiz struct {
	store RemoveGroupMemberStorage
}

// Constructor
func NewRemoveGroupMemberBiz(store RemoveGroupMemberStorage) *removeGroupMemberBiz {
	return &removeGroupMemberBiz{store: store}
}

// Logic chính
func (biz *removeGroupMemberBiz) RemoveMember(ctx context.Context, groupID, userID string) error {

	setUserId, _ := primitive.ObjectIDFromHex(userID)
	setGroupId, _ := primitive.ObjectIDFromHex(groupID)

	// Kiểm tra đầu vào
	if setUserId.IsZero() || setGroupId.IsZero() {
		return fmt.Errorf("groupID hoặc userID không hợp lệ")
	}

	// Gọi xuống tầng storage để xóa
	if err := biz.store.RemoveMember(ctx, setGroupId, setUserId); err != nil {
		return fmt.Errorf("không thể xóa thành viên khỏi nhóm: %w", err)
	}

	return nil
}
