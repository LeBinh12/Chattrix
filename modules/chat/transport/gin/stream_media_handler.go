package ginMessage

import (
	"fmt"
	"io"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/storage"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func StreamMediaHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		mediaID := c.Param("id")

		store := storage.NewMongoChatStore(db)
		mediaBiz := biz.NewMediaBiz(store)

		file, size, modTime, err := mediaBiz.GetMedia(c.Request.Context(), mediaID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Media not found"})
			return
		}
		defer file.(io.Closer).Close()

		rangeHeader := c.GetHeader("Range")
		start, end := int64(0), size-1

		if rangeHeader != "" && strings.HasPrefix(rangeHeader, "bytes=") {
			parts := strings.Split(strings.TrimPrefix(rangeHeader, "bytes="), "-")
			start, _ = strconv.ParseInt(parts[0], 10, 64)
			if len(parts) > 1 && parts[1] != "" {
				end, _ = strconv.ParseInt(parts[1], 10, 64)
			}
		}

		if start > end || start < 0 || end >= size {
			c.Header("Content-Range", fmt.Sprintf("bytes */%d", size))
			c.Status(http.StatusRequestedRangeNotSatisfiable)
			return
		}

		c.Header("Content-Type", "video/mp4") // hoặc lấy từ Media.Type
		c.Header("Accept-Ranges", "bytes")
		c.Header("Content-Length", fmt.Sprintf("%d", end-start+1))
		c.Header("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, size))
		c.Status(http.StatusPartialContent)

		file.Seek(start, 0)
		http.ServeContent(c.Writer, c.Request, mediaID, modTime, file)
	}
}
