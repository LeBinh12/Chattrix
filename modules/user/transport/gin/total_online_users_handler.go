package ginUser

import (
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func TotalOnlineUsersHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		store := storage.NewMongoStore(db)
		business := biz.NewCountOnlineUsersBiz(store)

		total, err := business.TotalOnlineUsers(ctx.Request.Context())
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, common.ErrCannotGetEntity("UserStatus", err))
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Tổng số người dùng đang online", total))
	}
}
