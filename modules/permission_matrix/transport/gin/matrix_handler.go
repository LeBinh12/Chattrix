package ginMatrix

import (
	"my-app/common"
	"my-app/modules/permission_matrix/biz"
	"my-app/modules/permission_matrix/models"
	"my-app/modules/permission_matrix/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// GetPermissionMatrixHandler - Lấy dữ liệu permission matrix
func GetPermissionMatrixHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		store := storage.NewMatrixStore(db)
		business := biz.NewGetMatrixBiz(store)

		matrix, err := business.GetPermissionMatrix(c.Request.Context())
		if err != nil {
			if appErr, ok := err.(*common.AppError); ok {
				c.JSON(appErr.StatusCode, common.NewResponse(
					appErr.StatusCode,
					appErr.Message,
					nil,
				))
				return
			}
			c.JSON(http.StatusInternalServerError, common.NewResponse(
				http.StatusInternalServerError,
				"Lỗi hệ thống",
				nil,
			))
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(
			http.StatusOK,
			"success",
			matrix,
		))
	}
}

// UpdatePermissionMatrixHandler - Cập nhật permission matrix
func UpdatePermissionMatrixHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.UpdatePermissionMatrixRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(
				http.StatusBadRequest,
				"Dữ liệu không hợp lệ: "+err.Error(),
				nil,
			))
			return
		}

		// TODO: Get user info from context (sau khi implement authentication)
		// userID := c.GetString("user_id")
		// userName := c.GetString("user_name")
		userID := "system"
		userName := "System Admin"

		store := storage.NewMatrixStore(db)
		business := biz.NewUpdateMatrixBiz(store)

		result, err := business.UpdatePermissionMatrix(c.Request.Context(), &req, userID, userName)
		if err != nil {
			if appErr, ok := err.(*common.AppError); ok {
				c.JSON(appErr.StatusCode, common.NewResponse(
					appErr.StatusCode,
					appErr.Message,
					nil,
				))
				return
			}
			c.JSON(http.StatusInternalServerError, common.NewResponse(
				http.StatusInternalServerError,
				"Lỗi hệ thống: "+err.Error(),
				nil,
			))
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(
			http.StatusOK,
			result.Message,
			result,
		))
	}
}
