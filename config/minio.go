package config

import (
	"context"
	"log"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var MinioClient *minio.Client

func InitMinio() {
	endpoint := "localhost:9000"
	accessKey := "dthuadmin"
	secretKey := "SuperStrongPwd123!"
	useSSL := false

	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})

	if err != nil {
		log.Fatalln(" Cấu hình Minio lỗi:", err)
	}

	MinioClient = minioClient

	log.Println("Kết nối minio thành công!", endpoint)

	// Tạo bucket nếu chưa có
	ctx := context.Background()
	bucketName := "chat-media"
	location := "us-east-1"

	exists, err := MinioClient.BucketExists(ctx, bucketName)
	if err == nil && !exists {
		err = MinioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{Region: location})
		if err != nil {
			log.Fatalln("Can't create bucket:", err)
		}
		log.Println("Created bucket:", bucketName)
	}
}
