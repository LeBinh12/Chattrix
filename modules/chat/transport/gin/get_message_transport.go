package ginMessage

import (
	"log"
	"my-app/common"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/storage"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetMessages(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var receiverObjectID, groupObjectID primitive.ObjectID
		senderID, exists := ctx.Get("userID")
		if !exists {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Không tìm thấy userID trong context"})
			return
		}

		senderIDStr, ok := senderID.(string)
		if !ok {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "userID không hợp lệ"})
			return
		}

		senderObjectID, err := primitive.ObjectIDFromHex(senderIDStr)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "userID không phải ObjectID hợp lệ"})
			return
		}

		receiverIDStr := ctx.Query("receiver_id")
		groupIDStr := ctx.Query("group_id")
		beforeTimeStr := ctx.Query("beforeTime")

		var beforeTimePtr *time.Time

		if beforeTimeStr != "" {
			parsedTime, err := time.Parse(time.RFC3339, beforeTimeStr)
			if err == nil {
				beforeTimePtr = &parsedTime
			} else {
				log.Printf(" invalid beforeTime format: %v", err)
			}
		}

		// Gọi hàm GetMessage

		if receiverIDStr != "" {
			receiverObjectID, err = primitive.ObjectIDFromHex(receiverIDStr)
			if err != nil {
				ctx.JSON(http.StatusBadRequest, gin.H{"error": "receiver_id không phải ObjectID hợp lệ"})
				return
			}
		}

		if groupIDStr != "" {
			groupObjectID, err = primitive.ObjectIDFromHex(groupIDStr)
			if err != nil {
				ctx.JSON(http.StatusBadRequest, gin.H{"error": "group_id không phải ObjectID hợp lệ"})
				return
			}
		}

		limit, _ := strconv.ParseInt(ctx.DefaultQuery("limit", "20"), 10, 64)

		store := storage.NewMongoChatStore(db)
		business := biz.NewGetMessageBiz(store)

		messages, err := business.GetMessage(ctx.Request.Context(), senderObjectID, receiverObjectID, groupObjectID, limit, beforeTimePtr)

		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if len(messages) == 0 {
			ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Bạn chưa có tin nhắn nào", gin.H{
				"data":  []interface{}{},
				"limit": limit,
				"count": 0,
			}))
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đã gửi lời mời kết bạn",
			map[string]interface{}{
				"data":  messages,
				"limit": limit,
				"count": len(messages),
			}))
	}
}
