package biz

import (
	"context"
	"errors"
	"fmt"
	"my-app/modules/friend/models"
	"my-app/modules/friend/storage"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CreateFriendStorage interface {
	Create(ctx context.Context, data *models.FriendShip) error
	CheckUserExists(ctx context.Context, userID string) (bool, error)
	CheckFriend(ctx context.Context, userID, FriendID string) (models.FriendShip, error)
	UpdateStatusWithAction(ctx context.Context, id primitive.ObjectID, newStatus storage.FriendStatus, lastActionBy string) error
}

type CreateFriendBiz struct {
	store CreateFriendStorage
}

func NewCreateFriendBiz(store CreateFriendStorage) *CreateFriendBiz {
	return &CreateFriendBiz{store: store}
}

func (biz *CreateFriendBiz) Create(ctx context.Context, data *models.FriendShip) error {

	checkFriendExist, _ := biz.store.CheckFriend(ctx, data.UserID, data.FriendID)

	// Xét 2 khả năng để kiểm tra xem tôi -> bạn có không nếu có rồi thì chỉ cần chỉnh lại trạng thái
	// nhưng nếu user_id trước tôi đang nằm ở friend thì đổi mã lại
	if checkFriendExist.ID.IsZero() {
		checkReverse, _ := biz.store.CheckFriend(ctx, data.FriendID, data.UserID)

		if checkReverse.ID.IsZero() {

			friendExist, err := biz.store.CheckUserExists(ctx, data.FriendID)

			if err != nil {
				return err
			}

			if friendExist == false {
				return errors.New("Friend not found")
			}

			now := time.Now()
			fri := &models.FriendShip{
				UserID:       data.UserID,
				FriendID:     data.FriendID,
				LastActionBy: data.UserID, // Người gửi lời mời
				Status:       string(storage.StatusPending),
			}

			fri.ID = primitive.NewObjectID()
			fri.CreatedAt = now
			fri.UpdatedAt = now

			if err := biz.store.Create(ctx, fri); err != nil {
				return err
			}

			return nil
		}

		checkFriendExist = checkReverse
	}

	if checkFriendExist.FriendID == data.UserID && checkFriendExist.Status == string(storage.StatusPending) {
		return errors.New("Người này đang kết bạn cho bạn, bạn không được gửi kết bạn đến họ")
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
		return errors.New("Bạn đang khóa tài khoản người dùng này")
	default:
		return fmt.Errorf("trạng thái bạn bè không xác định: %s", checkFriendExist.Status)
	}

	if err := biz.store.UpdateStatusWithAction(ctx, checkFriendExist.ID, newStatus, data.UserID); err != nil {
		return err
	}
	return nil
}
