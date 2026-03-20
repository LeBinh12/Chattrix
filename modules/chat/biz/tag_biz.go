package biz

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type TagStorage interface {
	UpsertTags(ctx context.Context, tag *models.ConversationTag) error
	GetTags(ctx context.Context, userID primitive.ObjectID) ([]models.ConversationTag, error)
}

type TagBiz struct {
	store TagStorage
}

func NewTagBiz(store TagStorage) *TagBiz {
	return &TagBiz{store: store}
}

func (biz *TagBiz) UpdateTags(ctx context.Context, userID primitive.ObjectID, req *models.UpdateTagsRequest) error {
	targetID, err := primitive.ObjectIDFromHex(req.TargetID)
	if err != nil {
		return err
	}

	tag := &models.ConversationTag{
		UserID:   userID,
		TargetID: targetID,
		IsGroup:  req.IsGroup,
		Tags:     req.Tags,
	}

	return biz.store.UpsertTags(ctx, tag)
}

func (biz *TagBiz) ListTags(ctx context.Context, userID primitive.ObjectID) (map[string][]string, error) {
	tags, err := biz.store.GetTags(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make(map[string][]string)
	for _, t := range tags {
		key := ""
		if t.IsGroup {
			key = "group_" + t.TargetID.Hex()
		} else {
			key = "user_" + t.TargetID.Hex()
		}
		result[key] = t.Tags
	}
	return result, nil
}
