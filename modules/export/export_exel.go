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
	"go.mongodb.org/mongo-driver/bson"
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

func ExportUsersStatisticsExcelHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()

		collection := db.Collection("user_status")

		// Aggregation pipeline as provided by user
		pipeline := mongo.Pipeline{
			{{Key: "$lookup", Value: bson.M{
				"from":         "users",
				"localField":   "user_id",
				"foreignField": "_id",
				"as":           "user",
			}}},
			{{Key: "$unwind", Value: "$user"}},
			{{Key: "$project", Value: bson.M{
				"_id":     0,
				"user_id": 1,
				"status":  1,
				"updated_at": bson.M{
					"$dateToString": bson.M{
						"format":   "%d/%m/%Y %H:%M:%S",
						"date":     "$updated_at",
						"timezone": "Asia/Ho_Chi_Minh",
					},
				},
				"birthday": bson.M{
					"$dateToString": bson.M{
						"format":   "%d/%m/%Y",
						"date":     "$user.birthday",
						"timezone": "Asia/Ho_Chi_Minh",
					},
				},
				"username":     "$user.username",
				"display_name": "$user.display_name",
				"phone":        "$user.phone",
			}}},
			{{Key: "$sort", Value: bson.D{{Key: "updated_at", Value: -1}}}},
		}

		cursor, err := collection.Aggregate(ctx, pipeline)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrInternal(err))
			return
		}
		defer cursor.Close(ctx)

		var results []map[string]interface{}
		if err := cursor.All(ctx, &results); err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrInternal(err))
			return
		}

		// Create Excel
		f := excelize.NewFile()
		defer f.Close()

		sheet := "Danh sách người dùng"
		f.SetSheetName("Sheet1", sheet)

		// Header
		headers := []string{"STT", "Họ tên", "Số điện thoại", "Thời gian truy cập", "Trạng thái", "Số lượt truy cập/ngày"}
		for i, h := range headers {
			colName, _ := excelize.ColumnNumberToName(i + 1)
			f.SetCellValue(sheet, colName+"1", h)
		}

		// Data
		for i, item := range results {
			row := i + 2
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), item["display_name"])
			f.SetCellValue(sheet, fmt.Sprintf("C%d", row), item["phone"])
			f.SetCellValue(sheet, fmt.Sprintf("D%d", row), item["updated_at"])
			f.SetCellValue(sheet, fmt.Sprintf("E%d", row), item["status"])
			f.SetCellValue(sheet, fmt.Sprintf("F%d", row), 0) // Placeholder for hits per day
		}

		// Width
		f.SetColWidth(sheet, "A", "E", 25)
		f.SetColWidth(sheet, "F", "G", 15)

		c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="users_statistical_%s.xlsx"`, time.Now().Format("20060102_150405")))

		if err := f.Write(c.Writer); err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrInternal(err))
			return
		}
	}
}
