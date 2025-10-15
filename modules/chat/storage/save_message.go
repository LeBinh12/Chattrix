package storage

import (
	"context"
	"my-app/modules/chat/models"
)

func (s *MongoChatStore) SaveMessage(ctx context.Context, msg *models.Message) error {
	_, err := s.db.Collection("messages").InsertOne(ctx, msg)
	return err
}
