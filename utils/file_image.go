package utils

import (
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
)

var allowExts = map[string]bool{
	// Ảnh
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".bmp":  true,
	".webp": true,

	// Video
	".mp4":  true,
	".avi":  true,
	".mov":  true,
	".mkv":  true,
	".webm": true,

	// Tài liệu
	".pdf":  true,
	".doc":  true,
	".docx": true,
	".xls":  true,
	".xlsx": true,
	".ppt":  true,
	".pptx": true,
	".txt":  true,
	".csv":  true,
	".zip":  true,
	".rar":  true,
}

var allowMineTypes = map[string]bool{
	// Ảnh
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
	"image/bmp":  true,
	"image/webp": true,

	// Video
	"video/mp4":        true,
	"video/avi":        true,
	"video/x-msvideo":  true,
	"video/quicktime":  true,
	"video/x-matroska": true,
	"video/webm":       true,

	// Tài liệu
	"application/pdf":    true,
	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true, // docx
	"application/vnd.ms-excel": true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         true, // xlsx
	"application/vnd.ms-powerpoint":                                             true,
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": true, // pptx
	"text/plain":                   true,
	"text/csv":                     true,
	"application/zip":              true,
	"application/x-rar-compressed": true,
}

// giới hạn dung lượng (tính bằng byte)
const (
	maxImageSize = 10 * 1024 * 1024  // 10MB
	maxVideoSize = 200 * 1024 * 1024 // 200MB
	maxFileSize  = 100 * 1024 * 1024 // 100MB
)

func ValidateAndSaveFile(fileHeader *multipart.FileHeader) error {
	if fileHeader == nil {
		return errors.New("File trống")
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowExts[ext] {
		return fmt.Errorf("Sai định dạng file: %s", ext)
	}

	// đọc 512 byte đầu để kiểm tra MIME type
	file, err := fileHeader.Open()
	if err != nil {
		return errors.New("Không mở được file")
	}
	defer file.Close()

	buffer := make([]byte, 512)
	_, err = file.Read(buffer)
	if err != nil {
		return errors.New("Không đọc được file")
	}

	mimeType := http.DetectContentType(buffer)
	if !allowMineTypes[mimeType] {
		return fmt.Errorf("File không phải ảnh hợp lệ, MIME type: %s", mimeType)
	}

	// Xác định loại file để kiểm tra dung lượng
	switch {
	case strings.HasPrefix(mimeType, "image/"):
		if fileHeader.Size > maxImageSize {
			return fmt.Errorf("Ảnh vượt quá dung lượng cho phép (tối đa %.1fMB)", float64(maxImageSize)/(1024*1024))
		}
	case strings.HasPrefix(mimeType, "video/"):
		if fileHeader.Size > maxVideoSize {
			return fmt.Errorf("Video vượt quá dung lượng cho phép (tối đa %.1fMB)", float64(maxVideoSize)/(1024*1024))
		}
	default:
		if fileHeader.Size > maxFileSize {
			return fmt.Errorf("File vượt quá dung lượng cho phép (tối đa %.1fMB)", float64(maxFileSize)/(1024*1024))
		}
	}

	return nil
}


