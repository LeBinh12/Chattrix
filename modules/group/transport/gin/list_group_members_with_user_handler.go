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

func ListGroupMembersWithUserHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		groupIDStr := c.Query("groupID")
		groupID, err := primitive.ObjectIDFromHex(groupIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "groupID không hợp lệ"})
			return
		}

		page, _ := strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
		pageSize, _ := strconv.ParseInt(c.DefaultQuery("size", "10"), 10, 64)

		store := storage.NewMongoStoreGroup(db)
		business := biz.NewListUsersNotInGroupBiz(store)

		members, total, err := business.ListMembers(c, groupID, page, pageSize)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrDB(err))
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Lấy danh sách thành viên thành công", gin.H{
			"data":       members,
			"page":       page,
			"pageSize":   pageSize,
			"total":      total,
			"totalPages": (total + pageSize - 1) / pageSize,
		}))
	}
}
