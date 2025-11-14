package utils

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"my-app/config"
	"net/http"

	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
)

func UploadFileToCloudinary(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	if fileHeader == nil {
		return "", nil
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	resp, err := config.CLD.Upload.Upload(ctx, file, uploader.UploadParams{})
	if err != nil {
		return "", err
	}

	return resp.SecureURL, nil
}

func UploadFileToMinio(file multipart.File, fileHeader *multipart.FileHeader) (string, error) {

	objectName := fmt.Sprintf("%s-%s", uuid.New().String(), fileHeader.Filename)
	bucketName := "chat-media"
	contentType := fileHeader.Header.Get("Content-Type")

	_, err := config.MinioClient.PutObject(context.Background(),
		bucketName,
		objectName,
		file,
		fileHeader.Size,
		minio.PutObjectOptions{ContentType: contentType})
	if err != nil {
		return "", err
	}

	fileURL := fmt.Sprintf("%s", objectName)
	return fileURL, nil

}

func UploadImageFromURLToMinio(imageURL string) (string, error) {
	// Gửi request GET tới URL ảnh
	resp, err := http.Get(imageURL)
	if err != nil {
		return "", fmt.Errorf("không tải được ảnh từ URL: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ảnh trả về mã lỗi: %d", resp.StatusCode)
	}

	// Đọc dữ liệu ảnh
	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("không đọc được dữ liệu ảnh: %v", err)
	}

	objectName := fmt.Sprintf("%s.jpg", uuid.New().String())
	bucketName := "chat-media"
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	// Upload lên MinIO
	_, err = config.MinioClient.PutObject(
		context.Background(),
		bucketName,
		objectName,
		bytes.NewReader(imageData),
		int64(len(imageData)),
		minio.PutObjectOptions{ContentType: contentType},
	)
	if err != nil {
		return "", fmt.Errorf("không upload được ảnh lên MinIO: %v", err)
	}

	// Trả về URL hoặc objectName
	fileURL := fmt.Sprintf("%s", objectName)
	return fileURL, nil
}
