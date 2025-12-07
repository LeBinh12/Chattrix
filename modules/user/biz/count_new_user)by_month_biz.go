package biz

import "context"

// Storage interface để Biz gọi
type CountNewUsersByMonthStorage interface {
	CountNewUsersByMonth(ctx context.Context) (map[string]int64, error)
}

// Biz struct
type CountNewUsersByMonthBiz struct {
	store CountNewUsersByMonthStorage
}

// Khởi tạo Biz
func NewCountNewUsersByMonthBiz(store CountNewUsersByMonthStorage) *CountNewUsersByMonthBiz {
	return &CountNewUsersByMonthBiz{store: store}
}

// Lấy thống kê người dùng mới theo từng tháng
func (biz *CountNewUsersByMonthBiz) CountNewUsersByMonth(ctx context.Context) (map[string]int64, error) {
	return biz.store.CountNewUsersByMonth(ctx)
}
