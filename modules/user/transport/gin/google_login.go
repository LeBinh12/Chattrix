	package ginUser

	import (
		"context"
		"my-app/common"
		"my-app/modules/user/models"
		"my-app/modules/user/storage"
		"my-app/utils"
		"net/http"
		"os"

		"github.com/gin-gonic/gin"
		"go.mongodb.org/mongo-driver/bson/primitive"
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

			store := storage.NewMongoStore(db)

			user, err := store.FindByEmail(ctx.Request.Context(), email)

			// Nếu chưa có thì tạo mới
			if err == mongo.ErrNoDocuments {

				newUser := &models.User{
					Email:       email,
					Username:    name,
					Avatar:      picture,
					DisplayName: name,
				}

				newUser.ID = primitive.NewObjectID()

				if err := store.Create(ctx.Request.Context(), newUser); err != nil {
					ctx.JSON(http.StatusInternalServerError, appErrorToJSON(common.ErrDB(err)))
					return
				}

				user = newUser
			} else if err != nil {
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			// Sinh JWT token cho user
			token, err := utils.GenerateJWT(user.ID.Hex())
			if err != nil {
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
				return
			}

			ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đăng nhập thành công", token))

		}
	}
