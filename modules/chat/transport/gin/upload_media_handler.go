package ginMessage

import (
	"fmt"
	"my-app/common"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
	"my-app/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func UploadMediaHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		form, err := ctx.MultipartForm()
		fmt.Println("form", form)

		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Không thể đọc form dữ liệu"})
			return
		}
		files := form.File["files"] // nhận danh sách file (key phải trùng ở client)
		fmt.Println("files", files)

		if len(files) == 0 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Không tìm thấy file nào"})
			return
		}

		if len(files) > 9 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Tối đa 9 file"})
			return
		}

		var mediaList []models.Media
		store := storage.NewMongoChatStore(db)
		business := biz.NewCreateMediaBiz(store)

		for _, fileHeader := range files {
			// Validate từng file
			if err := utils.ValidateAndSaveFile(fileHeader); err != nil {
				ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			// Mở file
			file, err := fileHeader.Open()
			if err != nil {
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể mở file"})
				return
			}
			// Upload lên MinIO
			url, err := utils.UploadFileToMinio(file, fileHeader)
			if err != nil {
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			mediaType := utils.DetectMediaType(fileHeader.Header.Get("Content-Type"))
			media := models.Media{
				Type:     mediaType,
				Filename: fileHeader.Filename,
				Size:     fileHeader.Size,
				URL:      url,
			}

			fmt.Println("media", media)
			createdMedia, err := business.UploadMedia(ctx.Request.Context(), &media)
			if err != nil {
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lưu media vào DB"})
				return
			}
			mediaList = append(mediaList, *createdMedia)
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Upload dữ liệu thành công", mediaList))
	}

}
