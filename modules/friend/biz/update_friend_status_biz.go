package biz

import (
	"context"
	"errors"
	"my-app/modules/friend/models"
	"my-app/modules/friend/storage"
)

type UpdateFriendStatusStorage interface {
	UpdateFriendStatusByUsers(ctx context.Context, userA, userB string, newStatus storage.FriendStatus) error
	CheckFriend(ctx context.Context, userID, friendID string) (models.FriendShip, error)
}

type UpdateFriendStatusBiz struct {
	store UpdateFriendStatusStorage
}

func NewUpdateFriendStatusBiz(store UpdateFriendStatusStorage) *UpdateFriendStatusBiz {
	return &UpdateFriendStatusBiz{store: store}
}

func (biz *UpdateFriendStatusBiz) UpdateStatus(ctx context.Context, userID, friendID string, newStatus storage.FriendStatus) error {
	friend, err := biz.store.CheckFriend(ctx, userID, friendID)
	if err != nil {
		return err
	}

	if friend.Status != string(storage.StatusPending) {
		return errors.New("chỉ có thể cập nhật khi trạng thái là pending")
	}

	if err := biz.store.UpdateFriendStatusByUsers(ctx, userID, friendID, newStatus); err != nil {
		return err
	}

	return nil
}
