package storage

import (
	"context"
	"my-app/modules/group/models"
	"time"
)

func (s *mongoStoreGroup) CreateGroupNumber(ctx context.Context, data *models.GroupMember) error {
	data.JoinedAt = time.Now()
	_, err := s.db.Collection("group_members").InsertOne(ctx, data)
	return err
}
