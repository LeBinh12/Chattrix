package ginUser

import (
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func TotalUsersHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		store := storage.NewMongoStore(db)
		business := biz.NewCountAllUsersStorageBiz(store)

		total, err := business.TotalUsers(ctx.Request.Context())
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, common.ErrCannotGetEntity("User", err))
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Tổng số người dùng", total))
	}
}
