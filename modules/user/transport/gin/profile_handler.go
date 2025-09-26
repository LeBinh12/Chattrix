package ginUser

import (
	"my-app/common"
	"my-app/modules/user/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func ProfileHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userID, exists := ctx.Get("userID")

		if !exists {
			ctx.JSON(http.StatusUnauthorized, common.NewUnauthorized(nil, "Không tìm thấy userID trong token", "missing userID", "UNAUTHORIZED"))
			return
		}

		store := storage.NewUserStore(db)

		user, err := store.FindByID(ctx.Request.Context(), userID.(string))

		if err != nil {
			ctx.JSON(http.StatusNotFound, common.ErrCannotGetEntity("User", err))
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Lấy thông tin người dùng thành công", user))
	}
}
