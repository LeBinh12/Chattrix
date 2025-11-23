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

func GetMessageId(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		// Lấy user_id từ context (đã set từ middleware auth)
		userID, exists := ctx.Get("userID")
		if !exists {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Chưa đăng nhập"})
			return
		}

		senderObjectID, err := primitive.ObjectIDFromHex(userID.(string))
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "userID không hợp lệ"})
			return
		}

		// Lấy các tham số
		messageIDStr := ctx.Query("message_id")
		receiverIDStr := ctx.Query("receiver_id")
		groupIDStr := ctx.Query("group_id")

		// Validate message_id
		if messageIDStr == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu message_id"})
			return
		}

		messageObjectID, err := primitive.ObjectIDFromHex(messageIDStr)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "message_id không hợp lệ"})
			return
		}

		// Validate: Chỉ được 1 trong 2 (receiver_id HOẶC group_id)
		if (receiverIDStr == "" && groupIDStr == "") || (receiverIDStr != "" && groupIDStr != "") {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Phải cung cấp receiver_id HOẶC group_id (không được cả hai)"})
			return
		}

		var receiverObjectID, groupObjectID primitive.ObjectID

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

		store := storage.NewMongoChatStore(db)
		business := biz.NewGetMessageIdBiz(store)

		messages, err := business.GetMessageByID(
			ctx.Request.Context(),
			senderObjectID,
			receiverObjectID,
			groupObjectID,
			messageObjectID,
		)

		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Lấy tin nhắn thành công",
			map[string]interface{}{
				"data": messages,
			}))
	}
}
