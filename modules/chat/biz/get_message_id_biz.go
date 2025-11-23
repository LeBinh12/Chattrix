package biz

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type GetMessageIdStorage interface {
	GetMessageByID(ctx context.Context, senderID, receiverID, groupID, messageID primitive.ObjectID) ([]models.MessageResponse, error)
}

type getMessageIdBiz struct {
	store GetMessageIdStorage
}

func NewGetMessageIdBiz(store GetMessageIdStorage) *getMessageIdBiz {
	return &getMessageIdBiz{store: store}
}

func (biz *getMessageIdBiz) GetMessageByID(
	ctx context.Context,
	senderID, receiverID, groupID, messageID primitive.ObjectID,
) ([]models.MessageResponse, error) {
	messages, err := biz.store.GetMessageByID(ctx, senderID, receiverID, groupID, messageID)
	if err != nil {
		return nil, err
	}
	return messages, nil
}
