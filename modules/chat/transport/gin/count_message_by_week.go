package ginMessage

import (
	"my-app/common"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/storage"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func StatisticalWeeklyMessageHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		store := storage.NewMongoChatStore(db)
		biz := biz.NewCountMessageByWeekBiz(store)

		data, err := biz.GetWeeklyMessageStatistic(c.Request.Context())
		if err != nil {
			c.JSON(500, common.ErrCannotGetEntity("statistic", err))
			return
		}

		c.JSON(200, common.NewResponse(200, "Thống kê tuần thành công", data))
	}
}
