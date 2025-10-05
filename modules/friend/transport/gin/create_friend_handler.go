package ginFriend

import (
	"context"
	"fmt"
	"my-app/common"
	"my-app/modules/friend/biz"
	"my-app/modules/friend/models"
	"my-app/modules/friend/storage"
	"my-app/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func CreateFriendHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var data models.FriendShip
		userID, exists := ctx.Get("userID")

		if !exists {
			ctx.JSON(http.StatusUnauthorized, common.NewUnauthorized(nil, "Không tìm thấy userID trong token", "missing userID", "UNAUTHORIZED"))
			return
		}

		if err := ctx.ShouldBindJSON(&data); err != nil {
			ctx.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}

		fmt.Println("user_Id_local: ", userID)
		fmt.Println("user_Id_local: ", data.UserID)

		if userID != data.UserID {
			ctx.JSON(http.StatusUnauthorized, common.NewResponse(http.StatusBadRequest, "Bạn không phải là người gửi", nil))
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
