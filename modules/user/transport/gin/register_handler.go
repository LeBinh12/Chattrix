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

func RegisterHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.RegisterRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewRegisterBiz(store)

		if err := business.Register(c.Request.Context(), &req); err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrDB(err))
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đăng ký thành công", nil))
	}
}
