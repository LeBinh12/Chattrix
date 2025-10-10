package kafka

import (
	"context"
	"encoding/json"
	"log"
	"my-app/modules/chat/biz"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"

	"github.com/IBM/sarama"
	"go.mongodb.org/mongo-driver/mongo"
)

type chatConsumer struct {
	db *mongo.Database
}

// Hàm này sẽ chạy Consumer của 1 Topic đã truyền ở trên và nó sẽ liên tục lắng nghe
func StartConsumer(brokers []string, groupID, topic string, db *mongo.Database) {
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
		if err := consumerGroup.Consume(ctx, []string{topic}, handler); err != nil {
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
			var chatMsg models.Message
			if err := json.Unmarshal(msg.Value, &chatMsg); err != nil {
				log.Println("Unmarshal error:", err)
				continue
			}
			chatStore := storage.NewMongoStore(c.db)
			chatBiz := biz.NewChatBiz(chatStore)

			// Lưu xuống database
			if _, err := chatBiz.HandleMessage(context.Background(), chatMsg.SenderID.Hex(),
				chatMsg.ReceiverID.Hex(), chatMsg.Content, chatMsg.Status); err != nil {
				log.Println("DB save error:", err)
			}

			sess.MarkMessage(msg, "")

			// case:...
		}
	}

	return nil
}
