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

func GetMessagesBelow(db *mongo.Database) gin.HandlerFunc {
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
		afterTimeStr := ctx.Query("afterTime")

		if afterTimeStr == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "afterTime là bắt buộc"})
			return
		}

		parsedTime, err := time.Parse(time.RFC3339, afterTimeStr)
		if err != nil {
			log.Printf("invalid afterTime format: %v", err)
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "afterTime không hợp lệ"})
			return
		}

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
		business := biz.NewGetMessageBelowBiz(store)

		messages, err := business.GetMessageBelow(ctx.Request.Context(), senderObjectID, receiverObjectID, groupObjectID, limit, parsedTime)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if len(messages) == 0 {
			ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Chưa có tin nhắn mới", gin.H{
				"data":  []interface{}{},
				"limit": limit,
				"count": 0,
			}))
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đã load tin nhắn mới",
			map[string]interface{}{
				"data":  messages,
				"limit": limit,
				"count": len(messages),
			}))
	}
}
