package ginUser

import (
	"my-app/common"
	"my-app/modules/chat/transport/websocket"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func SoftDeleteUserHandler(db *mongo.Database, hub *websocket.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		userID, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(400, "User ID không hợp lệ", nil))
			return
		}

		collection := db.Collection("users")
		now := time.Now()
		update := bson.M{
			"$set": bson.M{
				"is_deleted": true,
				"deleted_at": now,
				"updated_at": now,
			},
		}

		_, err = collection.UpdateOne(c.Request.Context(), bson.M{"_id": userID}, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrDB(err))
			return
		}

		// Trigger WebSocket force logout
		if hub != nil {
			hub.Broadcast <- websocket.HubEvent{
				Type:    "account_deleted",
				Payload: idStr, // Gửi UserID bị xóa
			}
		}

		c.JSON(http.StatusOK, common.NewResponse(200, "Xóa người dùng thành công", nil))
	}
}
