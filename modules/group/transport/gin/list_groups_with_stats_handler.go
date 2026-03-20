package ginGroup

import (
	"my-app/common"
	"my-app/modules/group/biz"
	"my-app/modules/group/storage"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func ListAllGroupsWithStatsHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Pagination
		page, _ := strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
		pageSize, _ := strconv.ParseInt(c.DefaultQuery("size", "10"), 10, 64)

		search := c.Query("name")
		minMember, _ := strconv.Atoi(c.DefaultQuery("min_member", "0"))
		maxMember, _ := strconv.Atoi(c.DefaultQuery("max_member", "0"))

		store := storage.NewMongoStoreGroup(db)
		business := biz.NewListUsersNotInGroupBiz(store)

		groups, total, err := business.ListAllGroups(c, page, pageSize, search, minMember, maxMember)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrDB(err))
			return
		}

		totalPages := (total + pageSize - 1) / pageSize

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Groups retrieved successfully", gin.H{
			"data":       groups,
			"page":       page,
			"pageSize":   pageSize,
			"total":      total,
			"totalPages": totalPages,
		}))
	}
}
