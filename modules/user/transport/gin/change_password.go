package ginUser

import (
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/models"
	"my-app/modules/user/storage"
	"my-app/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func ChangePasswordHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.ChangePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}

		userID := c.MustGet("userID").(string)

		store := storage.NewMongoStore(db)
		business := biz.NewChangePasswordBiz(store)

		if err := business.ChangePassword(c.Request.Context(), userID, &req); err != nil {
			c.JSON(http.StatusBadRequest, err)
			return
		}

		// Issue new token after changing password
		// Lấy danh sách role của user
		roles, err := business.GetUserRoles(c.Request.Context(), userID)
		if err != nil {
			roles = []string{}
		}

		newToken, err := utils.GenerateJWT(userID, roles)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrInternal(err))
			return
		}

		c.JSON(http.StatusOK, common.SimpleSuccessResponse(newToken))
	}
}
