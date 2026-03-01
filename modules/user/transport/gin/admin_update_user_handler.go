package ginUser

import (
	"fmt"
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/models"
	"my-app/modules/user/storage"
	"my-app/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func AdminUpdateUserHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		userID, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(400, "User ID không hợp lệ", nil))
			return
		}

		var req models.AdminUpdateUserRequest

		// Kiểm tra Content-Type để xử lý đúng request
		contentType := c.ContentType()

		if contentType == "multipart/form-data" {

			req.Username = c.PostForm("username")
			req.Email = c.PostForm("email")
			req.Phone = c.PostForm("phone")
			req.DisplayName = c.PostForm("display_name")
			req.Gender = c.PostForm("gender")
			req.Type = c.PostForm("type")
			req.Description = c.PostForm("description")

			// Parse roles từ form data (được gửi dạng: roles=id1&roles=id2)
			rolesStr := c.PostFormArray("roles")
			if len(rolesStr) > 0 {
				req.Roles = rolesStr
			}

			fmt.Printf("🔍 [Admin Update] Received roles from form: %v (count=%d)\n", rolesStr, len(rolesStr))

			birthdayStr := c.PostForm("birthday")
			if birthdayStr != "" {
				birthday, err := time.Parse("2006-01-02", birthdayStr)
				if err != nil {
					c.JSON(http.StatusBadRequest, common.NewResponse(400, "Ngày sinh không hợp lệ (format: YYYY-MM-DD)", nil))
					return
				}
				req.Birthday = birthday
			}

			avatarFile, _ := c.FormFile("avatar")
			if avatarFile != nil {
				if err := utils.ValidateAndSaveFile(avatarFile); err != nil {
					c.JSON(http.StatusBadRequest, common.NewResponse(400, err.Error(), nil))
					return
				}
				file, _ := avatarFile.Open()
				defer file.Close()

				url, err := utils.UploadFileToMinio(file, avatarFile)
				if err != nil {
					c.JSON(http.StatusInternalServerError, common.ErrDB(err))
					return
				}
				req.Avatar = url
			}
		} else {
			// Xử lý JSON body
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, common.NewResponse(400, fmt.Sprintf("Dữ liệu không hợp lệ: %v", err), nil))
				return
			}
		}

		store := storage.NewMongoStore(db)
		business := biz.NewAdminUpdateUserBiz(store)
		fmt.Printf("🔍 [Admin Update] Request Roles: %v\n", req.Roles)
		if err := business.UpdateUser(c.Request.Context(), userID, &req); err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(400, fmt.Sprintf("Cập nhật thất bại: %v", err), nil))
			return
		}

		user, err := business.GetUserByID(c.Request.Context(), idStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.NewResponse(500, "Không tìm thấy user sau khi update", nil))
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(200, "Cập nhật user thành công", user))
	}
}
