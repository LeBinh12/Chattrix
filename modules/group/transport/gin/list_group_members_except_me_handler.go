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

		// 1. Get userID from context (auth middleware)
		userIDStr, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "userID not found in context",
			})
			return
		}

		userIDHex, ok := userIDStr.(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid userID",
			})
			return
		}

		userID, err := primitive.ObjectIDFromHex(userIDHex)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "userID is not a valid ObjectID",
			})
			return
		}

		pageStr := c.Query("page")
		limitStr := c.Query("limit")
		keyword := c.Query("keyword")

		page := 1
		limit := 20 // default

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

		// 2. Get groupID from param
		groupIDHex := c.Query("group_id")
		groupID, err := primitive.ObjectIDFromHex(groupIDHex)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid group_id",
			})
			return
		}

		// 3. Initialize store & biz
		store := storage.NewMongoStoreGroup(db)
		business := biz.NewListGroupMembersExceptMeBiz(store)

		// 4. Call business logic
		members, total, err := business.List(c, groupID, userID, page, limit, keyword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrDB(err))
			return
		}

		// 5. Response
		c.JSON(http.StatusOK, common.NewResponse(
			http.StatusOK,
			"Group members retrieved successfully",
			gin.H{
				"members": members, // member list
				"page":    page,    // current page
				"limit":   limit,   // items per page
				"total":   total,
			},
		))
	}
}
