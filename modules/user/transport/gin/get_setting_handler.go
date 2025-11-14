package ginUser

import (
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/models"
	"my-app/modules/user/storage"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetSettingHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		userID, exists := ctx.Get("userID")
		if !exists {
			ctx.JSON(401, common.NewUnauthorized(nil, "Không tìm thấy userID trong token", "missing userID", "UNAUTHORIZED"))
			return
		}

		userIDStr, ok := userID.(string)
		if !ok {
			ctx.JSON(200, common.NewResponse(400, "UserID không hợp lệ", userIDStr))
			return
		}

		objectID, err := primitive.ObjectIDFromHex(userIDStr)
		if err != nil {
			ctx.JSON(200, common.NewResponse(400, "UserID không hợp lệ", objectID))
			return
		}

		// Lấy targetID và isGroup từ query params
		targetIDStr := ctx.Query("target_id")
		if targetIDStr == "" {
			ctx.JSON(200, common.NewResponse(400, "target_id bắt buộc", targetIDStr))
			return
		}

		targetObjectID, err := primitive.ObjectIDFromHex(targetIDStr)
		if err != nil {
			ctx.JSON(200, common.NewResponse(400, "target_id không hợp lệ", targetObjectID))
			return
		}

		isGroupStr := ctx.DefaultQuery("is_group", "false")
		isGroup := false
		if isGroupStr == "true" {
			isGroup = true
		}

		store := storage.NewMongoStore(db)
		business := biz.NewGetSettingBiz(store)

		var model = models.GetUserChatSettingRequest{
			UserID:   objectID,
			TargetID: targetObjectID,
			IsGroup:  isGroup,
		}

		setting, err := business.GetSetting(ctx.Request.Context(), &model)

		if err != nil {
			panic(err)
		}

		ctx.JSON(200, common.NewResponse(200, "Lấy cài đặt thành công", setting))
	}
}
