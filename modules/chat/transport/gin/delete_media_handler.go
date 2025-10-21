package ginMessage

import (
	"my-app/common"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func DeleteMediaHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		mediaID := ctx.Param("mediaID")
		if mediaID == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "mediaID không được để trống"})
			return
		}

		store := storage.NewMongoChatStore(db)
		business := biz.NewDeleteMediaBiz(store)

		if err := business.DeleteMedia(ctx.Request.Context(), mediaID); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể xóa media: " + err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Xóa media thành công", gin.H{"mediaID": mediaID}))
	}
}
