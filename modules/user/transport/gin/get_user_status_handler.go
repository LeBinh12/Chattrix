package ginUser

import (
	"context"
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetUserStatusHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()

		userID, exists := c.Get("userID")

		if !exists {
			c.JSON(http.StatusUnauthorized, common.NewUnauthorized(nil, "Không tìm thấy userID trong token", "missing userID", "UNAUTHORIZED"))
			return
		}

		senderIDStr, ok := userID.(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "userID không hợp lệ"})
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewGetUserStatusBiz(store)

		result, err := business.GetAll(ctx, senderIDStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đăng nhập thành công", result))
	}
}
