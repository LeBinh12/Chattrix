package storage

import (
	"context"
	"io"
	"my-app/config"
	"my-app/modules/chat/models"
	"time"

	"github.com/minio/minio-go/v7"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MongoChatStore) UploadMedia(ctx context.Context, media *models.Media) (*models.Media, error) {
	_, err := s.db.Collection("medias").InsertOne(ctx, media)
	if err != nil {
		return nil, err
	}

	return media, nil
}

func (s *MongoChatStore) OpenMedia(ctx context.Context, ID primitive.ObjectID) (io.ReadSeeker, int64, time.Time, error) {

	var media models.Media
	err := s.db.Collection("medias").FindOne(ctx, bson.M{"_id": ID}).Decode(&media)

	if err != nil {
		return nil, 0, time.Time{}, err
	}

	// Lấy object từ MinIO
	bucketName := "chat-media" // bucket của bạn
	obj, err := config.MinioClient.GetObject(ctx, bucketName, media.URL, minio.GetObjectOptions{})
	if err != nil {
		return nil, 0, time.Time{}, err
	}

	// Lấy size
	stat, err := obj.Stat()
	if err != nil {
		return nil, 0, time.Time{}, err
	}

	return obj, stat.Size, stat.LastModified, nil
}
