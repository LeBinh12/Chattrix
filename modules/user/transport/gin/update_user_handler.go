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

func CompleteProfileHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Lấy userID từ JWT middleware
		userIDRaw, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, common.NewResponse(401, "Không xác thực", nil))
			return
		}

		userIDStr, ok := userIDRaw.(string)
		if !ok {
			c.JSON(http.StatusInternalServerError, common.NewResponse(500, "User ID không hợp lệ", nil))
			return
		}

		userID, err := primitive.ObjectIDFromHex(userIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(400, "User ID không hợp lệ", nil))
			return
		}

		// Lấy các trường từ form-data
		phone := c.PostForm("phone")
		displayName := c.PostForm("display_name")
		gender := c.PostForm("gender")
		birthdayStr := c.PostForm("birthday")
		birthday, err := time.Parse("2006-01-02", birthdayStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(400, "Ngày sinh không hợp lệ", nil))
			return
		}

		// Xử lý avatar nếu có
		var avatarURL string
		avatarFile, _ := c.FormFile("avatar")
		if avatarFile != nil {
			if err := utils.ValidateAndSaveFile(avatarFile); err != nil {
				c.JSON(http.StatusBadRequest, common.NewResponse(400, err.Error(), nil))
				return
			}
			file, _ := avatarFile.Open()
			url, err := utils.UploadFileToMinio(file, avatarFile)
			if err != nil {
				c.JSON(http.StatusInternalServerError, common.ErrDB(err))
				return
			}
			avatarURL = url
		}

		req := &models.UpdateRequest{
			Phone:       phone,
			DisplayName: displayName,
			Birthday:    birthday,
			Gender:      gender,
			Avatar:      avatarURL,
		}

		// Tạo Biz và gọi CompleteProfile
		store := storage.NewMongoStore(db)
		business := biz.NewUserBiz(store)

		if err := business.CompleteProfile(c.Request.Context(), userID, req); err != nil {
			c.JSON(http.StatusBadRequest, common.NewResponse(400, fmt.Sprintf("Cập nhật thất bại: %v", err), nil))
			return
		}

		// Lấy user sau khi update
		user, err := business.GetUserByID(c.Request.Context(), userIDStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, common.NewResponse(500, "Không tìm thấy user", nil))
			return
		}

		// Tạo token nếu profile đã hoàn tất
		if user.IsProfileComplete {
			token, err := utils.GenerateJWT(user.ID.Hex())
			if err != nil {
				c.JSON(http.StatusInternalServerError, common.NewResponse(500, "Không thể tạo token", nil))
				return
			}

			// Trả về cả token, id, email
			data := map[string]interface{}{
				"token": token,
				"id":    user.ID.Hex(),
				"email": user.Email,
			}

			c.JSON(http.StatusOK, common.NewResponse(200, "Hoàn tất profile thành công", data))
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(200, "Profile đã được cập nhật nhưng chưa đầy đủ", nil))
	}
}
