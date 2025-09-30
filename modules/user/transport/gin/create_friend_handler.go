package ginUser

import (
	"context"
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/models"
	"my-app/modules/user/storage"
	"my-app/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func CreateFriendHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var data models.FriendShip
		if err := ctx.ShouldBindJSON(&data); err != nil {
			ctx.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}
		store := storage.NewMongoStoreFriend(db)
		business := biz.NewCreateFriendBiz(store)

		ctxs, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := business.Create(ctxs, &data); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đã gửi lời mời kết bạn", nil))
	}
}
