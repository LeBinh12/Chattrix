package user

import (
    "net/http"

    "github.com/gin-gonic/gin"

    "my-app/common"
    domrepo "my-app/internal/adapter/repository/mongo/user"
    "my-app/internal/adapter/security"
    usecase "my-app/internal/usecase/user"
    m "my-app/modules/user/models"
    "my-app/utils"
    "go.mongodb.org/mongo-driver/mongo"
)

// LoginHandler builds a clean-architecture login pipeline using local DI.
// It keeps the route signature stable while moving logic into usecases.
func LoginHandler(db *mongo.Database) gin.HandlerFunc {
    repo := domrepo.NewMongoRepository(db)
    checker := security.NewBcryptChecker()
    tokens := security.NewJWTIssuer()
    uc := usecase.NewLoginUsecase(repo, checker, tokens)

    return func(c *gin.Context) {
        var req m.LoginRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
            return
        }

        token, err := uc.Execute(c, req.Username, req.Password)
        if err != nil {
            c.JSON(http.StatusUnauthorized, common.NewUnauthorized(err, "Sai tài khoản hoặc mật khẩu", err.Error(), "INVALID_CREDENTIALS"))
            return
        }
        c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đăng nhập thành công", token))
    }
}
