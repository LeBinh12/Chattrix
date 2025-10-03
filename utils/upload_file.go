package utils

import (
	"context"
	"mime/multipart"
	"my-app/config"

	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
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
