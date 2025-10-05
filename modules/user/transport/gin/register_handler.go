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
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.PostForm("username")
		password := c.PostForm("password")
		email := c.PostForm("email")
		phone := c.PostForm("phone")
		displayName := c.PostForm("display_name")
		gender := c.PostForm("gender")
		birthdayStr := c.PostForm("birthday")
		birthday, err := time.Parse("2006-01-02", birthdayStr) // layout phải đúng
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Ngày sinh không hợp lệ"})
			return
		}

		avatarFile, _ := c.FormFile("avatar")
		var avatarURL string

		if avatarFile != nil {
			if err := utils.ValidateAndSaveFile(avatarFile); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			url, err := utils.UploadFileToCloudinary(c.Request.Context(), avatarFile)
			if err != nil {
				c.JSON(http.StatusInternalServerError, common.ErrDB(err))
				return
			}
			avatarURL = url
		} else {
			avatarURL = "null"
		}

		req := models.RegisterRequest{
			Username:    username,
			Password:    password,
			Email:       email,
			Phone:       phone,
			DisplayName: displayName,
			Avatar:      avatarURL,
			Gender:      gender,
			Birthday:    birthday,
		}

		if err := utils.ValidateStruct(&req); err != nil {
			c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}
		fmt.Println(req)
		store := storage.NewMongoStore(db)
		business := biz.NewRegisterBiz(store)

		if err := business.Register(c.Request.Context(), &req); err != nil {
			c.JSON(http.StatusInternalServerError, common.ErrDB(err))
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đăng ký thành công", nil))
	}
}
