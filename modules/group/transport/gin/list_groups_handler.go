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

func ListGroupsByUserHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		createBy, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Không tìm thấy userID trong context"})
			return
		}

		createByStr, ok := createBy.(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "userID không hợp lệ"})
			return
		}

		userID, err := primitive.ObjectIDFromHex(createByStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "userID không phải ObjectID hợp lệ"})
			return
		}

		// pagination
		page, _ := strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
		pageSize, _ := strconv.ParseInt(c.DefaultQuery("size", "10"), 10, 64)

		store := storage.NewMongoStoreGroup(db)
		business := biz.NewListGroupsByUserBiz(store)

		groups, err := business.List(c, userID, page, pageSize)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrDB(err))
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Lấy danh sách nhóm thành công", groups))
	}
}
