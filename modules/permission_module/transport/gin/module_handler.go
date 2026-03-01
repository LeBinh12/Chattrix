package ginModule

import (
	"math"
	"my-app/common"
	"my-app/modules/permission_module/biz"
	"my-app/modules/permission_module/models"
	"my-app/modules/permission_module/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// ListModulesHandler - Lấy danh sách module với phân trang và tìm kiếm
func ListModulesHandler(db *mongo.Database) gin.HandlerFunc {
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
		business := biz.NewListModuleBiz(store)

		modules, err := business.ListModules(c.Request.Context(), &paging, search)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.NewResponse(
				http.StatusInternalServerError,
				"Lỗi lấy danh sách module",
				nil,
			))
			return
		}

		// Convert to response format
		var moduleResponses []*models.ModuleResponse
		for _, module := range modules {
			moduleResponses = append(moduleResponses, module.ToResponse())
		}

		// Tính total_pages
		totalPages := int(math.Ceil(float64(paging.Total) / float64(paging.Limit)))

		data := map[string]interface{}{
			"items": moduleResponses,
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

// GetModuleHandler - Lấy chi tiết module
func GetModuleHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		store := storage.NewMongoStore(db)
		business := biz.NewGetModuleBiz(store)

		module, err := business.GetModuleByID(c.Request.Context(), id)
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
			module.ToResponse(),
		))
	}
}

// CreateModuleHandler - Tạo module mới
func CreateModuleHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreateModuleRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(
				http.StatusBadRequest,
				"Dữ liệu không hợp lệ: "+err.Error(),
				nil,
			))
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewCreateModuleBiz(store)

		module, err := business.CreateModule(c.Request.Context(), &req)
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
			"Tạo module thành công",
			module.ToResponse(),
		))
	}
}

// UpdateModuleHandler - Cập nhật module
func UpdateModuleHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req models.UpdateModuleRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(
				http.StatusBadRequest,
				"Dữ liệu không hợp lệ: "+err.Error(),
				nil,
			))
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewUpdateModuleBiz(store)

		module, err := business.UpdateModule(c.Request.Context(), id, &req)
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
			"Cập nhật module thành công",
			module.ToResponse(),
		))
	}
}

// DeleteModuleHandler - Xóa module
func DeleteModuleHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		store := storage.NewMongoStore(db)
		business := biz.NewDeleteModuleBiz(store)

		err := business.DeleteModule(c.Request.Context(), id)
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
			"Xóa module thành công",
			nil,
		))
	}
}
