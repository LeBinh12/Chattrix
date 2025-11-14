package biz

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UpdateSeenStatusStorage interface {
	UpdateStatusSeen(ctx context.Context, sender_id, receiver_id, lastSeenMsgID primitive.ObjectID, oldLastSeenMsgID primitive.ObjectID) error
	CreateOrUpdate(ctx context.Context, userID, conversationID, lastSeenMsgID primitive.ObjectID) error
	FindByUserAndConversation(ctx context.Context, userID, conversationID primitive.ObjectID) (*models.ChatSeenStatus, error)
}

type updateSeenStatusBiz struct {
	store UpdateSeenStatusStorage
}

func NewUpdateSeenStatusBiz(store UpdateSeenStatusStorage) *updateSeenStatusBiz {
	return &updateSeenStatusBiz{store: store}
}

func (biz *updateSeenStatusBiz) UpdateStatusSeen(
	ctx context.Context,
	userID, receiver_id, lastSeenMsgID, oldLastSeenMsgID primitive.ObjectID,
) error {
	return biz.store.UpdateStatusSeen(ctx, userID, receiver_id, lastSeenMsgID, oldLastSeenMsgID)
}

func (biz *updateSeenStatusBiz) CreateOrUpdate(
	ctx context.Context,
	userID, conversationID, lastSeenMsgID primitive.ObjectID,
) error {
	return biz.store.CreateOrUpdate(ctx, userID, conversationID, lastSeenMsgID)
}

func (biz *updateSeenStatusBiz) FindByUserAndConversation(ctx context.Context, userID, conversationID primitive.ObjectID) (*models.ChatSeenStatus, error) {
	return biz.store.FindByUserAndConversation(ctx, userID, conversationID)
}
