package storage

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func EnsureChatIndexes(ctx context.Context, db *mongo.Database) {
	messagesColl := db.Collection("messages")

	indexes := []mongo.IndexModel{
		{
			// Index cho update status seen 1-1 và unread count
			Keys: bson.D{
				{Key: "receiver_id", Value: 1},
				{Key: "sender_id", Value: 1},
				{Key: "is_read", Value: 1},
				{Key: "_id", Value: 1},
			},
			Options: options.Index().SetName("idx_unread_status_1to1"),
		},
		{
			// Index cho unread count group
			Keys: bson.D{
				{Key: "group_id", Value: 1},
				{Key: "is_read", Value: 1},
				{Key: "_id", Value: 1},
			},
			Options: options.Index().SetName("idx_unread_status_group"),
		},
		{
			// Index cho conversation list preview
			Keys: bson.D{
				{Key: "sender_id", Value: 1},
				{Key: "receiver_id", Value: 1},
				{Key: "created_at", Value: -1},
			},
			Options: options.Index().SetName("idx_conv_preview"),
		},
		{
			// Index cho deleted_for check
			Keys: bson.D{
				{Key: "deleted_for", Value: 1},
			},
			Options: options.Index().SetName("idx_deleted_for"),
		},
	}

	_, err := messagesColl.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("⚠️ Warning: Failed to create chat indexes: %v", err)
	} else {
		log.Println("✅ Chat MongoDB indexes ensured")
	}

	// Chat Seen Status indexes
	seenStatusColl := db.Collection("chat_seen_status")
	_, err = seenStatusColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "conversation_id", Value: 1},
		},
		Options: options.Index().SetUnique(true).SetName("idx_user_conv_unique"),
	})
	if err != nil {
		log.Printf("⚠️ Warning: Failed to create chat_seen_status indexes: %v", err)
	}

	// Group User Role indexes (prevent duplicates)
	gurColl := db.Collection("group_user_roles")
	_, err = gurColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "group_id", Value: 1},
			{Key: "user_id", Value: 1},
		},
		Options: options.Index().SetUnique(true).SetName("idx_group_user_unique"),
	})
	if err != nil {
		log.Printf("⚠️ Warning: Failed to create group_user_roles indexes (possibly existing duplicates): %v", err)
	}
}
