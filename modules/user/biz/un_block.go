package biz

import (
	"context"
	"my-app/modules/user/models"
	"my-app/modules/user/storage"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UnBlockStorage interface {
	UnBlock(ctx context.Context, ID primitive.ObjectID) error
	CheckFriend(ctx context.Context, userID, FriendID string) (models.FriendShip, error)
	UpdateStatus(ctx context.Context, friend_id primitive.ObjectID, newStatus storage.FriendStatus) error
}

type UnBlockBuz struct {
	store UnBlockStorage
}

func NewUnBlockBiz(store UnBlockStorage) *UnBlockBuz {
	return &UnBlockBuz{store: store}
}

func (biz *UnBlockBuz) UnBlock(ctx context.Context, user_id, friend_id string) error {
	checkFriendExist, _ := biz.store.CheckFriend(ctx, user_id, friend_id)

	var newStatus storage.FriendStatus

	switch checkFriendExist.Status {
	case string(storage.StatusBlock):
		newStatus = storage.StatusPending
	case string(storage.StatusPending):
		newStatus = storage.StatusBlock
	case string(storage.StatusNotFriend):
		newStatus = storage.StatusBlock
	case string(storage.StatusAccepted):
		newStatus = storage.StatusBlock
	}

	if err := biz.store.UpdateStatus(ctx, checkFriendExist.ID, newStatus); err != nil {
		return err
	}
	return nil
}
