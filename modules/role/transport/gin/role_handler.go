package ginRole

import (
	"math"
	"my-app/common"
	"my-app/modules/role/biz"
	"my-app/modules/role/models"
	"my-app/modules/role/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// CreateRoleHandler - Tạo role mới
func CreateRoleHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreateRoleRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(
				http.StatusBadRequest,
				"Dữ liệu không hợp lệ: "+err.Error(),
				nil,
			))
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewCreateRoleBiz(store)

		role, err := business.CreateRole(c.Request.Context(), &req)
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
			"Tạo role thành công",
			role.ToResponse(),
		))
	}
}

// ListRolesHandler - Lấy danh sách role với phân trang và tìm kiếm
func ListRolesHandler(db *mongo.Database) gin.HandlerFunc {
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

		store := storage.NewMongoStore(db)
		business := biz.NewListRoleBiz(store)

		roles, err := business.ListRoles(c.Request.Context(), &paging, search)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.NewResponse(
				http.StatusInternalServerError,
				"Lỗi lấy danh sách role",
				nil,
			))
			return
		}

		// Convert to response format
		var roleResponses []*models.RoleResponse
		for _, role := range roles {
			roleResponses = append(roleResponses, role.ToResponse())
		}

		// Tính total_pages
		totalPages := int(math.Ceil(float64(paging.Total) / float64(paging.Limit)))

		data := map[string]interface{}{
			"items": roleResponses,
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

// GetRoleHandler - Lấy chi tiết role
func GetRoleHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		store := storage.NewMongoStore(db)
		business := biz.NewGetRoleBiz(store)

		role, err := business.GetRoleByID(c.Request.Context(), id)
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
			role.ToResponse(),
		))
	}
}

// UpdateRoleHandler - Cập nhật role
func UpdateRoleHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		var req models.UpdateRoleRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(
				http.StatusBadRequest,
				"Dữ liệu không hợp lệ: "+err.Error(),
				nil,
			))
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewUpdateRoleBiz(store)

		role, err := business.UpdateRole(c.Request.Context(), id, &req)
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
			"Cập nhật role thành công",
			role.ToResponse(),
		))
	}
}

// DeleteRoleHandler - Xóa role
func DeleteRoleHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		store := storage.NewMongoStore(db)
		business := biz.NewDeleteRoleBiz(store)

		err := business.DeleteRole(c.Request.Context(), id)
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
			"Xóa role thành công",
			nil,
		))
	}
}

// GetRolesForUpdateHandler - Lấy danh sách role cho form chỉnh sửa user (không yêu cầu system:role:view)
// Chỉ cần permission system:user:update_global
func GetRolesForUpdateHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		store := storage.NewMongoStore(db)
		business := biz.NewListRoleBiz(store)

		// Lấy danh sách role không phân trang để dùng trong dropdown/form
		paging := common.Paging{
			Page:  1,
			Limit: 1000, // Giới hạn max 1000 roles
		}

		roles, err := business.ListRoles(c.Request.Context(), &paging, "")
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.NewResponse(
				http.StatusInternalServerError,
				"Lỗi lấy danh sách role",
				nil,
			))
			return
		}

		// Convert to response format
		var roleResponses []*models.RoleResponse
		for _, role := range roles {
			roleResponses = append(roleResponses, role.ToResponse())
		}

		// Trả về response đơn giản cho form
		data := map[string]interface{}{
			"items": roleResponses,
		}

		c.JSON(http.StatusOK, common.NewResponse(
			http.StatusOK,
			"success",
			data,
		))
	}
}
