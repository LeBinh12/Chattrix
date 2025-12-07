package api

import (
	ginMessage "my-app/modules/chat/transport/gin"
	statisticalgin "my-app/modules/chat/transport/gin/statistical_gin"
	"my-app/modules/export"
	ginGroup "my-app/modules/group/transport/gin"
	ginUser "my-app/modules/user/transport/gin"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterStatisticalRoutes(rg *gin.RouterGroup, db *mongo.Database) {
	upload := rg.Group("/statistical")
	{
		upload.GET("/count-today-message", statisticalgin.ConversationsHandler(db))
		upload.GET("/total-user", ginUser.TotalUsersHandler(db))
		upload.GET("/total-user-online", ginUser.TotalOnlineUsersHandler(db))
		upload.GET("/total-group", ginGroup.TotalGroupsHandler(db))
		upload.GET("/total-message-by-week", ginMessage.StatisticalWeeklyMessageHandler(db))
		upload.GET("/total-new-user-by-month", ginUser.TotalNewUsersByWeekHandler(db))
		upload.GET("/export-excel", export.ExportStatisticsExcelHandler(db))

	}
}
