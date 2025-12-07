package export

import (
	"fmt"
	"my-app/common"
	bizChat "my-app/modules/chat/biz"
	storageChat "my-app/modules/chat/storage"
	bizGroup "my-app/modules/group/biz"
	storageGroup "my-app/modules/group/storage"
	bizUser "my-app/modules/user/biz"
	"my-app/modules/user/storage"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"go.mongodb.org/mongo-driver/mongo"
)

func ExportStatisticsExcelHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		// Khởi tạo các store + biz
		userStore := storage.NewMongoStore(db)
		usersBiz := bizUser.NewCountAllUsersStorageBiz(userStore)
		onlineUsersBiz := bizUser.NewCountOnlineUsersBiz(userStore)
		newUsersMonthBiz := bizUser.NewCountNewUsersByMonthBiz(userStore)

		groupStore := storageGroup.NewMongoStoreGroup(db)
		groupBiz := bizGroup.NewCountAllGroupBiz(groupStore)

		chatStore := storageChat.NewMongoChatStore(db)
		messageWeekBiz := bizChat.NewCountMessageByWeekBiz(chatStore)

		// Lấy dữ liệu
		totalUsers, _ := usersBiz.TotalUsers(ctx)
		onlineUsers, _ := onlineUsersBiz.TotalOnlineUsers(ctx)
		totalGroups, _ := groupBiz.TotalGroups(ctx)
		messagesWeek, _ := messageWeekBiz.GetWeeklyMessageStatistic(ctx)
		newUsersMonth, _ := newUsersMonthBiz.CountNewUsersByMonth(ctx)

		// Tạo file Excel
		f := excelize.NewFile()
		f.SetSheetName("Sheet1", "Thống kê")
		sheet := "Thống kê"

		f.SetCellValue(sheet, "A1", "Thống kê")
		f.SetCellValue(sheet, "A2", "Loại")
		f.SetCellValue(sheet, "B2", "Giá trị")

		// Tổng người dùng
		f.SetCellValue(sheet, "A3", "Tổng người dùng")
		f.SetCellValue(sheet, "B3", totalUsers)

		// Người dùng online
		f.SetCellValue(sheet, "A4", "Người dùng online")
		f.SetCellValue(sheet, "B4", onlineUsers)

		// Tổng nhóm
		f.SetCellValue(sheet, "A5", "Tổng nhóm")
		f.SetCellValue(sheet, "B5", totalGroups)

		// Tin nhắn tuần
		f.SetCellValue(sheet, "A7", "Tin nhắn tuần")
		row := 8
		days := []string{"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
		for _, day := range days {
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), day)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), messagesWeek["personal"][day])
			f.SetCellValue(sheet, fmt.Sprintf("C%d", row), messagesWeek["group"][day])
			row++
		}
		f.SetCellValue(sheet, "B7", "Cá nhân")
		f.SetCellValue(sheet, "C7", "Nhóm")

		// Người dùng mới theo tháng
		f.SetCellValue(sheet, "A16", "Người dùng mới theo tháng")
		months := []string{"jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"}
		row = 17
		for _, month := range months {
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), month)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), newUsersMonth[month])
			row++
		}

		// Xuất file
		c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="statistical_%s.xlsx"`, time.Now().Format("20060102_150405")))
		if err := f.Write(c.Writer); err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrCannotGetEntity("Excel", err))
			return
		}
	}
}
