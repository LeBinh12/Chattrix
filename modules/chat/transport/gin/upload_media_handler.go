package ginMessage

import (
	"fmt"
	"my-app/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func UploadMediaHandler() gin.HandlerFunc {
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

		var urls []string
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
			defer file.Close()

			// Upload lên MinIO
			url, err := utils.UploadFileToMinio(file, fileHeader)
			if err != nil {
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			urls = append(urls, url)
		}

		ctx.JSON(http.StatusOK, gin.H{
			"message": "Upload thành công",
			"urls":    urls,
		})
	}

}
