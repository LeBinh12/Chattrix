package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (s *MongoChatStore) SaveMessage(ctx context.Context, msg *models.Message) error {
	_, err := s.db.Collection("messages").InsertOne(ctx, msg)
	return err
}

// IndexMessage implement interface ChatESIndexer
func (s *ESChatStore) IndexMessage(ctx context.Context, msg *models.Message, senderName string, senderAvatar string) error {

	contentRaw := stripHTML(msg.Content)

	doc := models.ESMessage{
		ID:           msg.ID.Hex(),
		ParentID:     hexIfPtrNotNil(msg.ParentMessageID),
		SenderID:     msg.SenderID.Hex(),
		ReceiverID:   msg.ReceiverID.Hex(),
		GroupID:      msg.GroupID.Hex(),
		Content:      msg.Content,
		ContentRaw:   contentRaw, // dùng để search
		CreatedAt:    msg.CreatedAt,
		SenderName:   senderName,
		SenderAvatar: senderAvatar,
		ReplyToID:    hexIfNotZero(msg.Reply.ID), // <- set reply id
		Reply:        msg.Reply,
		Type:         msg.Type,
		Task:         msg.Task,
		Status:       msg.Status,
		DeletedFor:   hexSlice(msg.DeletedFor),
		RecalledAt:   msg.RecalledAt,
	}

	body, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	res, err := s.client.Index(
		"messages",
		bytes.NewReader(body),
		s.client.Index.WithDocumentID(doc.ID),
		s.client.Index.WithRefresh("true"),
	)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		log.Printf("[ES] Index status: %s", res.Status())
	}

	return nil
}

func hexIfNotZero(id primitive.ObjectID) string {
	if id.IsZero() {
		return ""
	}
	return id.Hex()
}

func hexSlice(ids []primitive.ObjectID) []string {
	if ids == nil {
		return nil
	}
	res := make([]string, len(ids))
	for i, id := range ids {
		res[i] = id.Hex()
	}
	return res
}

func hexIfPtrNotNil(id *primitive.ObjectID) string {
	if id == nil {
		return ""
	}
	return id.Hex()
}
