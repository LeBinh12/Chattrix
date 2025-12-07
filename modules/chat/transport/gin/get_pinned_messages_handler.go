package ginMessage

import (
	"my-app/common"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetPinnedMessages(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		// --- Lấy user hiện tại ---
		senderIDStr, ok := ctx.Get("userID")
		if !ok {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Missing userID in context"})
			return
		}

		senderObjectID, err := primitive.ObjectIDFromHex(senderIDStr.(string))
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "userID không hợp lệ"})
			return
		}

		// --- Query ---
		receiverIDStr := ctx.Query("receiver_id")
		groupIDStr := ctx.Query("group_id")

		var receiverObjectID primitive.ObjectID
		var groupObjectID primitive.ObjectID

		if receiverIDStr != "" {
			receiverObjectID, err = primitive.ObjectIDFromHex(receiverIDStr)
			if err != nil {
				ctx.JSON(http.StatusBadRequest, gin.H{"error": "receiver_id không hợp lệ"})
				return
			}
		}

		if groupIDStr != "" {
			groupObjectID, err = primitive.ObjectIDFromHex(groupIDStr)
			if err != nil {
				ctx.JSON(http.StatusBadRequest, gin.H{"error": "group_id không hợp lệ"})
				return
			}
		}

		// --- Biz ---
		store := storage.NewMongoChatStore(db)
		business := biz.NewPinnedMessageDetailBiz(store)

		messages, err := business.GetPinnedMessages(
			ctx.Request.Context(),
			senderObjectID,
			receiverObjectID,
			groupObjectID,
		)

		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(
			http.StatusOK,
			"Success",
			map[string]interface{}{
				"data":  messages,
				"count": len(messages),
			},
		))
	}
}
