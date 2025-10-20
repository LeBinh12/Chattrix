package storage

import (
	"context"
	"my-app/modules/chat/models"
)

func (s *MongoChatStore) UploadMedia(ctx context.Context, media *models.Media) (*models.Media, error) {

	_, err := s.db.Collection("medias").InsertOne(ctx, media)
	if err != nil {
		return nil, err
	}

	return media, nil
}
