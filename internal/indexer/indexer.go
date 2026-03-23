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

	// Deleted for
	createIndex(ctx, messages, "deleted_for", bson.D{
		{Key: "deleted_for", Value: 1},
	}, false)
	
	// Optimized for conversation list
	createIndex(ctx, messages, "idx_msg_conv_sender", bson.D{
		{Key: "sender_id", Value: 1},
		{Key: "deleted_for", Value: 1},
		{Key: "group_id", Value: 1},
		{Key: "parent_message_id", Value: 1},
		{Key: "created_at", Value: -1},
	}, false)
	
	createIndex(ctx, messages, "idx_msg_conv_receiver", bson.D{
		{Key: "receiver_id", Value: 1},
		{Key: "deleted_for", Value: 1},
		{Key: "group_id", Value: 1},
		{Key: "parent_message_id", Value: 1},
		{Key: "created_at", Value: -1},
	}, false)

	// 2. Collection "chat_seen_status"
	seenStatus := db.Collection("chat_seen_status")
	createIndex(ctx, seenStatus, "idx_user_conv_unique", bson.D{
		{Key: "user_id", Value: 1},
		{Key: "conversation_id", Value: 1},
	}, true)

	// User Status (cho sorting)
	userStatus := db.Collection("user_status")
	createIndex(ctx, userStatus, "idx_status_updated", bson.D{
		{Key: "status", Value: -1},
		{Key: "updated_at", Value: -1},
	}, false)

	// 3. Collection "group_user_roles"
	groupRoles := db.Collection("group_user_roles")
	createIndex(ctx, groupRoles, "idx_group_user_unique", bson.D{
		{Key: "group_id", Value: 1},
		{Key: "user_id", Value: 1},
	}, true)

	// 4. Collection "users"
	users := db.Collection("users")
	createIndex(ctx, users, "idx_username_unique", bson.D{
		{Key: "username", Value: 1},
	}, true)
	createIndex(ctx, users, "idx_email_unique", bson.D{
		{Key: "email", Value: 1},
	}, true)
	
	// Performance optimization for user management
	createIndex(ctx, users, "idx_user_status_sort", bson.D{
		{Key: "is_deleted", Value: 1},
		{Key: "status", Value: -1},
		{Key: "updated_at", Value: -1},
	}, false)
	createIndex(ctx, users, "idx_user_display_name", bson.D{
		{Key: "display_name", Value: 1},
	}, false)
	createIndex(ctx, users, "idx_user_phone", bson.D{
		{Key: "phone", Value: 1},
	}, false)

	// 5. Collection "friend_ship"
	friendShip := db.Collection("friend_ship")
	createIndex(ctx, friendShip, "idx_user_friend", bson.D{
		{Key: "user_id", Value: 1},
		{Key: "friend_id", Value: 1},
	}, false)

	// 6. Collection "user_roles"
	userRoles := db.Collection("user_roles")
	createIndex(ctx, userRoles, "idx_user_role", bson.D{
		{Key: "user_id", Value: 1},
		{Key: "role_id", Value: 1},
	}, false)

	// 7. Collection "roles"
	roles := db.Collection("roles")
	createIndex(ctx, roles, "idx_role_code_unique", bson.D{
		{Key: "code", Value: 1},
	}, true)

	// 8. Collection "permissions"
	permissions := db.Collection("permissions")
	createIndex(ctx, permissions, "idx_perm_code_unique", bson.D{
		{Key: "code", Value: 1},
	}, true)

	// 9. Collection "modules"
	modules := db.Collection("modules")
	createIndex(ctx, modules, "idx_module_code_unique", bson.D{
		{Key: "code", Value: 1},
	}, true)

	// 10. Collection "role_permissions"
	rolePerms := db.Collection("role_permissions")
	createIndex(ctx, rolePerms, "idx_role_perm", bson.D{
		{Key: "role_id", Value: 1},
		{Key: "permission_id", Value: 1},
	}, false)

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
