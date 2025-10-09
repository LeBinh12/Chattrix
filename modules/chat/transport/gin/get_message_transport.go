package ginMessage

import (
	"my-app/common"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/storage"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetMessages(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
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

		if receiverIDStr == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu receiver_id"})
			return
		}

		receiverObjectID, err := primitive.ObjectIDFromHex(receiverIDStr)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "receiver_id không phải ObjectID hợp lệ"})
			return
		}

		limit, _ := strconv.ParseInt(ctx.DefaultQuery("limit", "20"), 10, 64)
		skip, _ := strconv.ParseInt(ctx.DefaultQuery("skip", "0"), 10, 64)

		store := storage.NewMongoGetMessageStore(db)
		business := biz.NewGetMessageBiz(store)

		messages, err := business.GetMessage(ctx.Request.Context(), senderObjectID, receiverObjectID, limit, skip)

		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đã gửi lời mời kết bạn",
			map[string]interface{}{
				"data":  messages,
				"limit": limit,
				"skip":  skip,
				"count": len(messages),
			}))
	}
}
