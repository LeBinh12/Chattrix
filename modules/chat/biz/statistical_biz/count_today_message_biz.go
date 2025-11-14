package statisticalbiz

import "context"

type CountTodayMessageStore interface {
	CountTodayMessages(ctx context.Context) (int64, error)
}

type MongoStatisticalStore struct {
	store CountTodayMessageStore
}

func NewListCountTodayMessageBiz(store CountTodayMessageStore) *MongoStatisticalStore {
	return &MongoStatisticalStore{store: store}
}

func (biz *MongoStatisticalStore) CountTodayMessages(ctx context.Context) (int64, error) {
	return biz.store.CountTodayMessages(ctx)
}
