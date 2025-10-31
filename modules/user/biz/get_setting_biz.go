package biz

import (
	"context"
	"my-app/common"
	"my-app/modules/user/models"
)

type GetSettingStorage interface {
	GetSetting(ctx context.Context, model *models.GetUserChatSettingRequest) (*models.UserChatSettingResponse, error)
}

type GetSettingBiz struct {
	store GetSettingStorage
}

func NewGetSettingBiz(store GetSettingStorage) *GetSettingBiz {
	return &GetSettingBiz{store: store}
}

func (biz *GetSettingBiz) GetSetting(ctx context.Context, model *models.GetUserChatSettingRequest) (*models.UserChatSettingResponse, error) {
	setting, err := biz.store.GetSetting(ctx, model)
	if err != nil {
		return nil, common.ErrDB(err)
	}

	// Nếu chưa có cài đặt, trả về mặc định
	if setting == nil {
		return &models.UserChatSettingResponse{
			TargetID: model.TargetID,
			IsGroup:  model.IsGroup,
			IsMuted:  false,
		}, nil
	}

	return &models.UserChatSettingResponse{
		TargetID:  setting.TargetID,
		IsGroup:   setting.IsGroup,
		IsMuted:   setting.IsMuted,
		MuteUntil: setting.MuteUntil,
	}, nil
}
