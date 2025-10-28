package storage

import (
	"context"
	"my-app/modules/group/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *mongoStoreGroup) CreateGroupNumber(ctx context.Context, data *models.GroupMember) error {
	data.JoinedAt = time.Now()
	_, err := s.db.Collection("group_members").InsertOne(ctx, data)
	return err
}

func (s *mongoStoreGroup) RemoveMember(ctx context.Context, groupID, userID primitive.ObjectID) error {
	_, err := s.db.Collection("group_members").DeleteOne(ctx, bson.M{
		"group_id": groupID,
		"user_id":  userID,
	})
	return err
}
