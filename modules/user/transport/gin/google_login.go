package ginUser

import (
	"context"
	"fmt"
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/models"
	"my-app/modules/user/storage"
	"my-app/utils"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"google.golang.org/api/idtoken"
)

func appErrorToJSON(err *common.AppError) gin.H {
	return gin.H{
		"status":  err.StatusCode,
		"message": err.Message,
		"key":     err.Key,
		"log":     err.Log,
	}
}

func GoogleLoginHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var req struct {
			IDToken string `json:"id_token" binding:"required"`
		}

		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Verify Google ID token
		payload, err := idtoken.Validate(context.Background(), req.IDToken, os.Getenv("GOOGLE_CLIENT_ID"))
		if err != nil {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google token"})
			return
		}
		
		email := payload.Claims["email"].(string)
		name := payload.Claims["name"].(string)
		picture := payload.Claims["picture"].(string)

		minioURL, err := utils.UploadImageFromURLToMinio(picture)
		if err != nil {
			fmt.Printf(" Upload avatar Google thất bại: %v\n", err)
		}

		store := storage.NewMongoStore(db)
		business := biz.NewGoogleLoginBiz(store)
		model := &models.GoogleLoginRequest{
			Email:     email,
			Name:      name,
			AvatarURL: minioURL,
		}

		token, err := business.LoginOrRegisterByGoogle(ctx.Request.Context(), model)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đăng nhập thành công", token))

	}
}
