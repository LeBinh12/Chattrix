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

func LoginHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.LoginRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewLoginBiz(store)

		token, err := business.Login(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusUnauthorized, common.NewUnauthorized(err, "Sai tài khoản hoặc mật khẩu", err.Error(), "INVALID_CREDENTIALS"))
			return
		}

		// TODO: generate JWT thay vì trả về user raw
		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đăng nhập thành công", token))
	}
}
