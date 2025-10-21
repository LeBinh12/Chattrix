package ginMessage

import (
	"context"
	"fmt"
	"my-app/config"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
)

func GetMediaHandler() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		objectName := ctx.Param("objectName")
		if objectName == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu tên file"})
			return
		}

		bucketName := "chat-media"

		// Lấy object từ MinIO
		obj, err := config.MinioClient.GetObject(context.Background(), bucketName, objectName, minio.GetObjectOptions{})
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer obj.Close()

		info, err := obj.Stat()
		if err != nil {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "File không tồn tại"})
			return
		}

		ctx.Header("Content-Type", info.ContentType)
		ctx.Header("Content-Length", fmt.Sprintf("%d", info.Size))
		ctx.Header("Content-Disposition", "inline; filename="+objectName)

		// Trả về file
		http.ServeContent(ctx.Writer, ctx.Request, objectName, info.LastModified, obj)
	}
}
