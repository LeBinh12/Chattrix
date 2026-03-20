package ginUser

import (
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func AdminResetPasswordHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")
		if userID == "" {
			c.JSON(http.StatusBadRequest, common.ErrInvalidRequest(nil))
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewAdminResetPasswordBiz(store)

		if err := business.ResetPassword(c.Request.Context(), userID); err != nil {
			c.JSON(http.StatusBadRequest, err)
			return
		}

		c.JSON(http.StatusOK, common.SimpleSuccessResponse(map[string]interface{}{
			"message": "Đã đặt lại mật khẩu thành công. Mật khẩu mới là: 123456",
		}))
	}
}
