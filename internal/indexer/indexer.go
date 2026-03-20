package indexer

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func Execute(db *mongo.Database) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 1. Collection "messages"
	messages := db.Collection("messages")

	createIndex(ctx, messages, "sender_receiver_read_id", bson.D{
		{Key: "sender_id", Value: 1},
		{Key: "receiver_id", Value: 1},
		{Key: "is_read", Value: 1},
		{Key: "_id", Value: -1},
	}, false)

	createIndex(ctx, messages, "group_read_id", bson.D{
		{Key: "group_id", Value: 1},
		{Key: "is_read", Value: 1},
		{Key: "_id", Value: -1},
	}, false)

	createIndex(ctx, messages, "sender_receiver_created", bson.D{
		{Key: "sender_id", Value: 1},
		{Key: "receiver_id", Value: 1},
		{Key: "created_at", Value: -1},
	}, false)

	createIndex(ctx, messages, "receiver_sender_created", bson.D{
		{Key: "receiver_id", Value: 1},
		{Key: "sender_id", Value: 1},
		{Key: "created_at", Value: -1},
	}, false)

	createIndex(ctx, messages, "group_created", bson.D{
		{Key: "group_id", Value: 1},
		{Key: "created_at", Value: -1},
	}, false)

	// Deleted for (thường dùng cho query lọc tin nhắn đã xóa)
	createIndex(ctx, messages, "deleted_for", bson.D{
		{Key: "deleted_for", Value: 1},
	}, false)

	// 2. Collection "chat_seen_status"
	seenStatus := db.Collection("chat_seen_status")
	createIndex(ctx, seenStatus, "user_conv", bson.D{
		{Key: "user_id", Value: 1},
		{Key: "conversation_id", Value: 1},
	}, true) // Unique if needed

	// 3. Collection "group_user_roles"
	groupRoles := db.Collection("group_user_roles")
	createIndex(ctx, groupRoles, "group_user", bson.D{
		{Key: "group_id", Value: 1},
		{Key: "user_id", Value: 1},
	}, true)

	log.Println("✅ All indexes created successfully.")
}

func createIndex(ctx context.Context, col *mongo.Collection, name string, keys bson.D, unique bool) {
	indexModel := mongo.IndexModel{
		Keys:    keys,
		Options: options.Index().SetName(name).SetUnique(unique),
	}
	_, err := col.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		log.Printf("⚠️ Could not create index %s on %s: %v", name, col.Name(), err)
	} else {
		log.Printf("🚀 Created index %s on %s", name, col.Name())
	}
}
