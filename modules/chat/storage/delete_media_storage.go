package storage

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MongoChatStore) DeleteMedia(ctx context.Context, mediaID string) error {
	id, err := primitive.ObjectIDFromHex(mediaID)
	if err != nil {
		return err
	}

	// Lấy media để lấy URL xóa trên MinIO nếu cần
	var media models.Media
	if err := s.db.Collection("medias").FindOne(ctx, bson.M{"_id": id}).Decode(&media); err != nil {
		return err
	}

	// TODO: Xóa file trên MinIO nếu bạn muốn
	// utils.DeleteFileFromMinio(media.URL)

	_, err = s.db.Collection("medias").DeleteOne(ctx, bson.M{"_id": id})
	return err
}
