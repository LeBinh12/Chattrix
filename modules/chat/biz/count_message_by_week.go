package biz

import "context"

type CountMessageByWeekStorage interface {
	CountMessageByWeek(ctx context.Context) (map[string]map[string]int64, error)
}

type CountMessageByWeekBiz struct {
	chatStore CountMessageByWeekStorage
}

func NewCountMessageByWeekBiz(chatStore CountMessageByWeekStorage) *CountMessageByWeekBiz {
	return &CountMessageByWeekBiz{chatStore: chatStore}
}

func (biz *CountMessageByWeekBiz) GetWeeklyMessageStatistic(ctx context.Context) (map[string]map[string]int64, error) {
	return biz.chatStore.CountMessageByWeek(ctx)
}
