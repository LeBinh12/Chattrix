package ginFriend

import (
	"my-app/common"
	"my-app/modules/friend/biz"
	"my-app/modules/friend/models"
	"my-app/modules/friend/storage"
	"my-app/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func SuggestFriendHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var query models.SuggestFriendQuery

		// ✅ Validate cơ bản
		if err := c.ShouldBindQuery(&query); err != nil {
			c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}

		// ✅ Gọi business layer
		store := storage.NewMongoStore(db)
		business := biz.NewSuggestFriendBiz(store)

		users, total, err := business.Suggest(c.Request.Context(),
			query.UserID, query.Keyword, query.Page, query.Limit)

		if err != nil {
			c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}

		// ✅ Trả về kết quả
		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Gợi ý bạn bè thành công", gin.H{
			"total": total,
			"page":  query.Page,
			"limit": query.Limit,
			"data":  users,
		}))
	}
}
