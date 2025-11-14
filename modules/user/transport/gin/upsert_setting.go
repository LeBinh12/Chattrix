package ginUser

import (
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/models"
	"my-app/modules/user/storage"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func UpsertSettingHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		var data *models.UserChatSettingRequest

		userID, exists := ctx.Get("userID")

		if !exists {
			ctx.JSON(http.StatusUnauthorized, common.NewUnauthorized(nil, "Không tìm thấy userID trong token", "missing userID", "UNAUTHORIZED"))
			return
		}

		store := storage.NewMongoStore(db)

		_, err := store.FindByID(ctx.Request.Context(), userID.(string))

		if err != nil {
			ctx.JSON(http.StatusNotFound, common.ErrCannotGetEntity("User", err))
			return
		}

		if err := ctx.ShouldBind(&data); err != nil {
			panic(common.ErrInvalidRequest(err))
		}

		userIDStr, _ := userID.(string)
		objectID, err := primitive.ObjectIDFromHex(userIDStr)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, common.ErrInvalidRequest(err))
			return
		}

		data.UserID = objectID

		if data.MuteUntil == nil {
			now := time.Now().UTC()
			data.MuteUntil = &now
		}

		business := biz.NewUpdateSettingBiz(store)

		if err := business.UpsertSetting(ctx.Request.Context(), data); err != nil {
			panic(err)
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Cập nhật thông báo thành công", data.IsMuted))
	}
}
