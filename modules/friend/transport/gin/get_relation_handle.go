package ginFriend

import (
	"context"
	"my-app/common"
	"my-app/modules/friend/biz"
	"my-app/modules/friend/storage"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetRelationHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, common.NewUnauthorized(nil, "Không tìm thấy userID trong token", "missing userID", "UNAUTHORIZED"))
			return
		}

		friendID := c.Query("friend_id")
		if friendID == "" {
			c.JSON(http.StatusBadRequest, common.NewResponse(http.StatusBadRequest, "Thiếu friend_id", nil))
			return
		}

		store := storage.NewMongoStoreFriend(db)
		business := biz.NewGetRelationBiz(store)

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		status, err := business.Get(ctx, userID.(string), friendID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.NewResponse(http.StatusInternalServerError, err.Error(), nil))
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Trạng thái quan hệ bạn bè", status))
	}
}
