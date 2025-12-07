package ginMessage

import (
	"my-app/common"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetMediaList(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		/** ----------------------
		 *  Lấy userID từ context
		 * ---------------------- **/
		rawUserID, exists := ctx.Get("userID")
		if !exists {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Không tìm thấy userID trong context"})
			return
		}

		userIDStr, ok := rawUserID.(string)
		if !ok {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "userID không hợp lệ"})
			return
		}

		senderID, err := primitive.ObjectIDFromHex(userIDStr)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "userID không phải ObjectID hợp lệ"})
			return
		}

		/** ----------------------
		 *  Parse receiver_id & group_id
		 * ---------------------- **/
		var receiverID, groupID primitive.ObjectID

		if v := ctx.Query("receiver_id"); v != "" {
			receiverID, err = primitive.ObjectIDFromHex(v)
			if err != nil {
				ctx.JSON(http.StatusBadRequest, gin.H{"error": "receiver_id không hợp lệ"})
				return
			}
		}

		if v := ctx.Query("group_id"); v != "" {
			groupID, err = primitive.ObjectIDFromHex(v)
			if err != nil {
				ctx.JSON(http.StatusBadRequest, gin.H{"error": "group_id không hợp lệ"})
				return
			}
		}

		/** ----------------------
		 *  Parse media_type
		 * ---------------------- **/
		mediaTypeStr := ctx.DefaultQuery("media_type", "")
		mediaType := models.MediaType(mediaTypeStr)

		if mediaType == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "media_type là bắt buộc"})
			return
		}

		/** ----------------------
		 *  Parse page & limit
		 * ---------------------- **/
		page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "20"))

		/** ----------------------
		 *  Business logic
		 * ---------------------- **/
		store := storage.NewMongoChatStore(db)
		mediaBiz := biz.NewMediaListBiz(store)

		result, err := mediaBiz.GetMediaList(
			ctx.Request.Context(),
			senderID,
			receiverID,
			groupID,
			mediaType,
			page,
			limit,
		)

		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		/** ----------------------
		 *  Response
		 * ---------------------- **/
		ctx.JSON(http.StatusOK, common.NewResponse(
			http.StatusOK,
			"Đã lấy danh sách media",
			map[string]interface{}{
				"page":  page,
				"limit": limit,
				"count": len(result.Items),
				"data":  result.Items,
			},
		))
	}
}
