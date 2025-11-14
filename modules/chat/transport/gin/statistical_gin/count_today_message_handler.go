package statisticalgin

import (
	"my-app/common"
	statisticalbiz "my-app/modules/chat/biz/statistical_biz"
	statisticalstorage "my-app/modules/chat/storage/statistical_storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func ConversationsHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		store := statisticalstorage.NewMongoStatisticalStore(db)
		business := statisticalbiz.NewListCountTodayMessageBiz(store)

		total, err := business.CountTodayMessages(ctx.Request.Context())
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Lấy dữ liệu thành công", total))

	}
}
