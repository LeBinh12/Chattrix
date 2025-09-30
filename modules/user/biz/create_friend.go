package biz

import (
	"context"
	"errors"
	"fmt"
	"my-app/modules/user/models"
	"my-app/modules/user/storage"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CreateFriendStorage interface {
	Create(ctx context.Context, data *models.FriendShip) error
	CheckUserExists(ctx context.Context, userID string) (bool, error)
	CheckFriend(ctx context.Context, userID, FriendID string) (models.FriendShip, error)
	UpdateStatus(ctx context.Context, friend_id primitive.ObjectID, newStatus storage.FriendStatus) error
}

type CreateFriendBiz struct {
	store CreateFriendStorage
}

func NewCreateFriendBiz(store CreateFriendStorage) *CreateFriendBiz {
	return &CreateFriendBiz{store: store}
}

func (biz *CreateFriendBiz) Create(ctx context.Context, data *models.FriendShip) error {
	fri := &models.FriendShip{
		ID:        primitive.NewObjectID(),
		UserID:    data.UserID,
		FriendID:  data.FriendID,
		Status:    string(storage.StatusPending),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	checkFriendExist, _ := biz.store.CheckFriend(ctx, data.UserID, data.FriendID)

	if checkFriendExist.ID.IsZero() {
		friendExist, err := biz.store.CheckUserExists(ctx, data.FriendID)

		if err != nil {
			return err
		}

		if friendExist == false {
			return errors.New("Friend not found")
		}

		if err := biz.store.Create(ctx, fri); err != nil {
			return err
		}

		return nil
	}

	var newStatus storage.FriendStatus

	switch checkFriendExist.Status {
	case string(storage.StatusPending):
		newStatus = storage.StatusNotFriend
	case string(storage.StatusNotFriend):
		newStatus = storage.StatusPending
	case string(storage.StatusAccepted):
		newStatus = storage.StatusPending
	case string(storage.StatusBlock):
		return fmt.Errorf("Bạn đang khóa tài khoản người dùng này")
	default:
		return fmt.Errorf("trạng thái bạn bè không xác định: %s", checkFriendExist.Status)
	}
	if err := biz.store.UpdateStatus(ctx, checkFriendExist.ID, newStatus); err != nil {
		return err
	}
	return nil
}
