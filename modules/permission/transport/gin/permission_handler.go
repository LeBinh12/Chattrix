package ginPermission

import (
	"math"
	"my-app/common"
	"my-app/modules/permission/biz"
	"my-app/modules/permission/models"
	"my-app/modules/permission/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// CreatePermissionHandler - Tạo permission mới
func CreatePermissionHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreatePermissionRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(
				http.StatusBadRequest,
				"Dữ liệu không hợp lệ: "+err.Error(),
				nil,
			))
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewCreatePermissionBiz(store)

		permission, err := business.CreatePermission(c.Request.Context(), &req)
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

		c.JSON(http.StatusCreated, common.NewResponse(
			http.StatusCreated,
			"Tạo permission thành công",
			permission.ToResponse(),
		))
	}
}

// ListPermissionsHandler - Lấy danh sách permission với phân trang và tìm kiếm
func ListPermissionsHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var paging common.Paging

		if err := c.ShouldBindQuery(&paging); err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(
				http.StatusBadRequest,
				"Tham số không hợp lệ",
				nil,
			))
			return
		}

		paging.Process()

		search := c.Query("search")
		moduleID := c.Query("module_id")

		store := storage.NewMongoStore(db)
		business := biz.NewListPermissionBiz(store)

		permissions, err := business.ListPermissions(c.Request.Context(), &paging, search, moduleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.NewResponse(
				http.StatusInternalServerError,
				"Lỗi lấy danh sách permission",
				nil,
			))
			return
		}

		// Convert to response format
		var permissionResponses []*models.PermissionResponse
		for _, permission := range permissions {
			permissionResponses = append(permissionResponses, permission.ToResponse())
		}

		// Tính total_pages
		totalPages := int(math.Ceil(float64(paging.Total) / float64(paging.Limit)))

		data := map[string]interface{}{
			"items": permissionResponses,
			"pagination": map[string]interface{}{
				"total":       paging.Total,
				"page":        paging.Page,
				"limit":       paging.Limit,
				"total_pages": totalPages,
			},
		}

		c.JSON(http.StatusOK, common.NewResponse(
			http.StatusOK,
			"success",
			data,
		))
	}
}

// GetPermissionHandler - Lấy chi tiết permission
func GetPermissionHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		store := storage.NewMongoStore(db)
		business := biz.NewGetPermissionBiz(store)

		permission, err := business.GetPermissionByID(c.Request.Context(), id)
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
			permission.ToResponse(),
		))
	}
}

// UpdatePermissionHandler - Cập nhật permission
func UpdatePermissionHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		var req models.UpdatePermissionRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(
				http.StatusBadRequest,
				"Dữ liệu không hợp lệ: "+err.Error(),
				nil,
			))
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewUpdatePermissionBiz(store)

		permission, err := business.UpdatePermission(c.Request.Context(), id, &req)
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
			"Cập nhật permission thành công",
			permission.ToResponse(),
		))
	}
}

// DeletePermissionHandler - Xóa permission
func DeletePermissionHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		store := storage.NewMongoStore(db)
		business := biz.NewDeletePermissionBiz(store)

		err := business.DeletePermission(c.Request.Context(), id)
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
			"Xóa permission thành công",
			nil,
		))
	}
}
