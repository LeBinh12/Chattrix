package ginGroup

import (
	"my-app/common"
	"my-app/modules/group/biz"
	"my-app/modules/group/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func TotalGroupsHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		store := storage.NewMongoStoreGroup(db)
		business := biz.NewCountAllGroupBiz(store)

		total, err := business.TotalGroups(ctx.Request.Context())
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, common.ErrCannotGetEntity("Group", err))
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Tổng số group", total))
	}
}
