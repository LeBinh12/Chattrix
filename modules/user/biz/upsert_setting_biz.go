package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/user/models"
)

type UpdateSettingStorage interface {
	UpsertSetting(ctx context.Context, data *models.UserChatSettingRequest) error
}

type updateSettingBiz struct {
	store UpdateSettingStorage
}

func NewUpdateSettingBiz(store UpdateSettingStorage) *updateSettingBiz {
	return &updateSettingBiz{store: store}
}

func (biz *updateSettingBiz) UpsertSetting(ctx context.Context, data *models.UserChatSettingRequest) error {

	if err := biz.store.UpsertSetting(ctx, data); err != nil {
		return common.ErrDB(err)
	}

	return nil
}
