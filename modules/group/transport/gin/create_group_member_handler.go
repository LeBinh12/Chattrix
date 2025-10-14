package ginGroup

import (
	"my-app/common"
	"my-app/modules/group/biz"
	"my-app/modules/group/models"
	"my-app/modules/group/storage"
	"my-app/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func CreateGroupMemberHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body models.GroupMember

		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}

		if body.Role == "" {
			body.Role = "member"
		}
		body.Status = "active"

		store := storage.NewMongoStoreGroup(db)
		business := biz.NewCreateGroupMemberBiz(store)

		if err := business.CreateGroupNumber(c, &body); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Thêm thành viên thành công", body))
	}
}
