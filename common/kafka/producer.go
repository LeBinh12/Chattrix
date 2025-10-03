package kafka

import (
	"log"

	"github.com/IBM/sarama"
)

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

	_, _, err := Producer.SendMessage(msg)
	return err
}
