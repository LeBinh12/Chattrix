package utils

import (
	"context"
	"fmt"
	"mime/multipart"
	"my-app/config"

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

	fileURL := fmt.Sprintf(objectName)
	return fileURL, nil

}
