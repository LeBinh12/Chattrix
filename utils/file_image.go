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
	".jpg":  true,
	".png":  true,
	".jpeg": true,
}

var allowMineTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
}

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

	return nil
}
