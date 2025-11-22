package ginMessage

import (
	"my-app/common"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/storage"
	"net/http"
	"strconv"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/gin-gonic/gin"
)

func SearchMessages(esClient *elasticsearch.Client) gin.HandlerFunc {
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

		content := ctx.Query("content")
		if content == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng cung cấp content để tìm kiếm"})
			return
		}

		receiverID := ctx.Query("receiver_id") // 1-1 chat
		groupID := ctx.Query("group_id")       // group chat
		limitStr := ctx.DefaultQuery("limit", "20")
		limit, _ := strconv.Atoi(limitStr)

		store := storage.NewESChatStore(esClient)
		business := biz.NewChatSearchBiz(store)

		messages, err := business.Search(ctx.Request.Context(), content, senderIDStr, receiverID, groupID, limit)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Tìm kiếm thành công", map[string]interface{}{
			"data":  messages,
			"count": len(messages),
			"limit": limit,
		}))
	}
}
