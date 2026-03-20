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
			c.JSON(http.StatusUnauthorized, gin.H{"error": "userID not found in context"})
			return
		}

		createByStr, ok := createBy.(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid userID"})
			return
		}

		userID, err := primitive.ObjectIDFromHex(createByStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "userID is not a valid ObjectID"})
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

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Groups retrieved successfully", groups))
	}
}
