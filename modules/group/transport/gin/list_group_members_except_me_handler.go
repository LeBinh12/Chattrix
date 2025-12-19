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

func ListGroupMembersExceptMeHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {

		// 1. Lấy userID từ context (middleware auth)
		userIDStr, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Không tìm thấy userID trong context",
			})
			return
		}

		userIDHex, ok := userIDStr.(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "userID không hợp lệ",
			})
			return
		}

		userID, err := primitive.ObjectIDFromHex(userIDHex)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "userID không phải ObjectID hợp lệ",
			})
			return
		}

		pageStr := c.Query("page")
		limitStr := c.Query("limit")
		keyword := c.Query("keyword")

		page := 1
		limit := 20 // mặc định

		if pageStr != "" {
			page, err = strconv.Atoi(pageStr)
			if err != nil || page < 1 {
				page = 1
			}
		}
		if limitStr != "" {
			limit, err = strconv.Atoi(limitStr)
			if err != nil || limit < 1 {
				limit = 20
			}
		}

		// 2. Lấy groupID từ param
		groupIDHex := c.Query("group_id")
		groupID, err := primitive.ObjectIDFromHex(groupIDHex)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "group_id không hợp lệ",
			})
			return
		}

		// 3. Khởi tạo store & biz
		store := storage.NewMongoStoreGroup(db)
		business := biz.NewListGroupMembersExceptMeBiz(store)

		// 4. Gọi nghiệp vụ
		members, total, err := business.List(c, groupID, userID, page, limit, keyword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrDB(err))
			return
		}

		// 5. Response
		c.JSON(http.StatusOK, common.NewResponse(
			http.StatusOK,
			"Lấy danh sách thành viên trong nhóm thành công",
			gin.H{
				"members": members, // danh sách thành viên
				"page":    page,    // trang hiện tại
				"limit":   limit,   // số phần tử/trang
				"total":   total,
			},
		))
	}
}
