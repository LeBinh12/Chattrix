package ginUser

import (
	"fmt"
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/storage"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func ListUsersWithStatusHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Lấy page và limit từ query params
		pageStr := c.DefaultQuery("page", "1")
		limitStr := c.DefaultQuery("limit", "10")

		page, err := strconv.ParseInt(pageStr, 10, 64)
		if err != nil || page <= 0 {
			page = 1
		}
		limit, err := strconv.ParseInt(limitStr, 10, 64)
		if err != nil || limit <= 0 {
			limit = 10
		}

		search := c.Query("q")
		gender := c.Query("gender")
		status := c.Query("status")
		fromDate := c.Query("from_date")
		toDate := c.Query("to_date")

		store := storage.NewMongoStore(db)
		business := biz.NewUserGetPaginationUserBiz(store)

		users, total, err := business.ListUsersWithStatus(c.Request.Context(), page, limit, search, gender, status, fromDate, toDate)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.NewResponse(500, "Lấy danh sách thất bại", nil))
			return
		}

		// DEBUG: Log response
		if len(users) > 0 {
			fmt.Printf("🔍 [Backend Handler] First user: Username=%s, Roles=%v\n", users[0].User.Username, users[0].Roles)
		}

		data := map[string]interface{}{
			"users": users,
			"page":  page,
			"limit": limit,
			"total": total,
		}

		c.JSON(http.StatusOK, common.NewResponse(200, "Lấy danh sách thành công", data))
	}
}
