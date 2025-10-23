package kafka

import (
	"fmt"
	"log"

	"github.com/IBM/sarama"
)

// Nếu dùng AsyncProducer thì có thể nhận 1 lần nhiều tin gửi xuống nhưng không bảo toàn dữ liệu

// var Producer sarama.AsyncProducer

// Nếu dùng SyncProducer thì có thể chậm hơn, dễ nghẽn nếu tốc độ gửi message cao nhưng bảo toàn dữ liệu

var Producer sarama.SyncProducer

func InitProducer(brokers []string) {
	config := sarama.NewConfig()
	config.Producer.Return.Successes = true
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Retry.Max = 5

	producer, err := sarama.NewSyncProducer(brokers, config)

	if err != nil {
		log.Fatalf("Lỗi khi tạo Kafka Producer: %v", err)
	}

	Producer = producer

}

func SendMessage(topic, key, value string) error {
	msg := &sarama.ProducerMessage{
		Topic: topic,
		Key:   sarama.StringEncoder(key),
		Value: sarama.StringEncoder(value),
	}
	fmt.Println("🔥 Kafka send user-status:", topic, value)

	_, _, err := Producer.SendMessage(msg)
	return err
}
