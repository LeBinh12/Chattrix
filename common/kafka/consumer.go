package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
	BizUser "my-app/modules/user/biz"
	ModelsUser "my-app/modules/user/models"
	StorageUser "my-app/modules/user/storage"

	BizGroup "my-app/modules/group/biz"
	StorageGroup "my-app/modules/group/storage"

	"github.com/IBM/sarama"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type chatConsumer struct {
	db *mongo.Database
}

// Hàm này sẽ chạy Consumer của 1 Topic đã truyền ở trên và nó sẽ liên tục lắng nghe
func StartConsumer(brokers []string, groupID string, topics []string, db *mongo.Database) {
	config := sarama.NewConfig()
	config.Version = sarama.V2_1_0_0
	config.Consumer.Return.Errors = true

	consumerGroup, err := sarama.NewConsumerGroup(brokers, groupID, config)
	if err != nil {
		log.Fatalf("Error creating consumer group: %v", err)
	}

	handler := &chatConsumer{db: db}
	ctx := context.Background()

	for {
		if err := consumerGroup.Consume(ctx, topics, handler); err != nil {
			log.Printf("Consumer error: %v", err)
		}
	}
}

// 2 hàm này chủ hoạt động khi có session mới hoặc kết thúc session
func (c *chatConsumer) Setup(_ sarama.ConsumerGroupSession) error   { return nil }
func (c *chatConsumer) Cleanup(_ sarama.ConsumerGroupSession) error { return nil }

// Hàm này chỉ hoạt động cho mọi partition mà consumer đang nghe
func (c *chatConsumer) ConsumeClaim(sess sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for msg := range claim.Messages() {
		switch msg.Topic {
		case "chat-topic":
			var chatMsg models.MessageResponse
			if err := json.Unmarshal(msg.Value, &chatMsg); err != nil {
				log.Println("Unmarshal error:", err)
				continue
			}
			chatStore := storage.NewMongoChatStore(c.db)
			chatBiz := biz.NewChatBiz(chatStore)

			// Lưu xuống database
			if _, err := chatBiz.HandleMessage(context.Background(), chatMsg.SenderID.Hex(),
				chatMsg.ReceiverID.Hex(), chatMsg.Content, chatMsg.Status, chatMsg.GroupID.Hex(), chatMsg.Type, chatMsg.MediaIDs, chatMsg.CreatedAt); err != nil {
				log.Println("DB save error:", err)
			}

			sess.MarkMessage(msg, "")

		case "update-status-message":
			var chatMsg models.MessageStatusRequest
			if err := json.Unmarshal(msg.Value, &chatMsg); err != nil {
				log.Println("Unmarshal error:", err)
				continue
			}

			senderID, err1 := primitive.ObjectIDFromHex(chatMsg.SenderID)           // người gửi (người mình mở form)
			receiverID, err2 := primitive.ObjectIDFromHex(chatMsg.ReceiverID)       // người nhận (là mình)
			lastSeenMsgID, err3 := primitive.ObjectIDFromHex(chatMsg.LastSeenMsgID) // tin nhắn mới nhất

			var oldLastSeenMsgID primitive.ObjectID
			if err1 != nil || err2 != nil || err3 != nil {
				log.Println(" ObjectID không hợp lệ:", err1, err2)
				continue
			}

			chatStore := storage.NewMongoChatStore(c.db)
			chatBiz := biz.UpdateSeenStatusStorage(chatStore)

			conversationID := storage.GetConversationID(senderID, receiverID)

			seen, err := chatBiz.FindByUserAndConversation(context.Background(), receiverID, conversationID)
			if err != nil {
				log.Println("FindByUserAndConversation error:", err)
			}
			if seen == nil {
				log.Println("Chưa có dữ liệu seen cũ, tạo mới")
			} else {
				oldLastSeenMsgID = seen.LastSeenMessageID
			}

			// Lưu xuống database
			if err := chatBiz.CreateOrUpdate(context.Background(), receiverID, conversationID, lastSeenMsgID); err != nil {
				log.Println("DB save error:", err)
			}

			if err := chatBiz.UpdateStatusSeen(context.Background(), senderID, receiverID, lastSeenMsgID, oldLastSeenMsgID); err != nil {
				log.Println(" Lỗi update Message seen:", err)
				continue
			}

			sess.MarkMessage(msg, "")

		case "user-status-topic":
			var userStatus ModelsUser.UserStatus
			fmt.Println("userStatus", userStatus)
			if err := json.Unmarshal(msg.Value, &userStatus); err != nil {
				log.Println("Unmarshal error:", err)
				continue
			}

			userStatusStore := StorageUser.NewMongoStore(c.db)
			userStatusBiz := BizUser.NewUserStatusBiz(userStatusStore)

			if err := userStatusBiz.Upsert(context.Background(), &userStatus); err != nil {
				log.Println("Update user_status error:", err)
			}

			sess.MarkMessage(msg, "")

		case "group-out":
			var groupOut models.MessageResponse
			if err := json.Unmarshal(msg.Value, &groupOut); err != nil {
				log.Println("Unmarshal error:", err)
				continue
			}

			GroupStore := StorageGroup.NewMongoStoreGroup(c.db)
			GroupBiz := BizGroup.NewRemoveGroupMemberBiz(GroupStore)

			if err := GroupBiz.RemoveMember(context.Background(), groupOut.GroupID.Hex(), groupOut.SenderID.Hex()); err != nil {
				log.Println("Update user_status error:", err)
			}

			sess.MarkMessage(msg, "")
		}
	}

	return nil
}
