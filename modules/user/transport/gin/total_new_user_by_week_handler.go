package ginUser

import (
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func TotalNewUsersByWeekHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		store := storage.NewMongoStore(db)
		business := biz.NewCountNewUsersByMonthBiz(store)

		total, err := business.CountNewUsersByMonth(ctx.Request.Context())
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, common.ErrCannotGetEntity("User", err))
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Thống kê người dùng theo tháng", total))
	}
}
