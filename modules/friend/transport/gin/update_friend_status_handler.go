package ginFriend

import (
	"context"
	"my-app/modules/friend/biz"
	"my-app/modules/friend/storage"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func UpdateFriendStatusHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing userID"})
			return
		}

		friendID := c.Query("friend_id")
		action := c.Query("action") // "accept" hoặc "reject"
		if friendID == "" || action == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing friend_id or action"})
			return
		}

		var newStatus storage.FriendStatus
		switch action {
		case "accept":
			newStatus = storage.StatusAccepted
		case "reject":
			newStatus = storage.StatusNotFriend
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid action"})
			return
		}

		store := storage.NewMongoStoreFriend(db)
		business := biz.NewUpdateFriendStatusBiz(store)

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := business.UpdateStatus(ctx, userID.(string), friendID, newStatus); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Cập nhật trạng thái bạn bè thành công", "status": newStatus})
	}
}
