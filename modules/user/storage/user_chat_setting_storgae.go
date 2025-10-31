package storage

import (
	"context"
	"my-app/modules/user/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *mongoStore) UpsertSetting(ctx context.Context, data *models.UserChatSettingRequest) error {
	collection := s.db.Collection("user_chat_setting")

	filter := bson.M{
		"user_id":   data.UserID,
		"target_id": data.TargetID,
		"is_group":  data.IsGroup,
	}

	update := bson.M{
		"$set": bson.M{
			"is_muted":   data.IsMuted,
			"mute_until": data.MuteUntil,
			"updated_at": time.Now(),
		},
		"$setOnInsert": bson.M{
			"created_at": time.Now(),
		},
	}

	_, err := collection.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	if err != nil {
		return err
	}

	return nil
}

func (s *mongoStore) GetSetting(ctx context.Context, model *models.GetUserChatSettingRequest) (*models.UserChatSettingResponse, error) {
	collection := s.db.Collection("user_chat_setting")

	filter := bson.M{
		"user_id":   model.UserID,
		"target_id": model.TargetID,
		"is_group":  model.IsGroup,
	}

	var setting models.UserChatSettingResponse
	err := collection.FindOne(ctx, filter).Decode(&setting)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &setting, nil
}
