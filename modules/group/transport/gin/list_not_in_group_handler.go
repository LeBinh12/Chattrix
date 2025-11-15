package ginGroup

import (
	"my-app/common"
	"my-app/modules/group/biz"
	"my-app/modules/group/storage"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func ListUsersNotInGroupHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		groupIDStr := c.Query("group_id")
		if groupIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "group_id là bắt buộc"})
			return
		}

		groupID, err := primitive.ObjectIDFromHex(groupIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "group_id không hợp lệ"})
			return
		}

		page, _ := strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
		size, _ := strconv.ParseInt(c.DefaultQuery("size", "10"), 10, 64)

		store := storage.NewMongoStoreGroup(db)
		business := biz.NewListUsersNotInGroupBiz(store)

		users, err := business.List(c, groupID, page, size)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrDB(err))
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Lấy danh sách user chưa vào nhóm thành công", users))
	}
}
