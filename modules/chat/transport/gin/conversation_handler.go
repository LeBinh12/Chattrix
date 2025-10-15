package ginMessage

import (
	"my-app/common"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
	"my-app/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func ConversationsHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var query models.ConversationRequest

		userIDValue, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Không tìm thấy userID trong context"})
			return
		}

		userID, ok := userIDValue.(string)

		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "userID không hợp lệ"})
			return
		}

		if err := c.ShouldBindQuery(&query); err != nil {
			c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}

		store := storage.NewMongoChatStore(db)
		business := biz.NewListConversationBiz(store)

		convs, total, err := business.ListConversations(c.Request.Context(), userID, query.Page, query.Limit, query.Keyword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Lấy dữ liệu thành công", gin.H{
			"data":    convs,
			"total":   total,
			"page":    query.Page,
			"limit":   query.Limit,
			"keyword": query.Keyword,
		}))

	}
}
