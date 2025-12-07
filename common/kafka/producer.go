package kafka

import (
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/IBM/sarama"
)

var (
	AsyncProducer sarama.AsyncProducer
	producerWg    sync.WaitGroup
	metrics       ProducerMetrics
	shutdownOnce  sync.Once
)

type ProducerMetrics struct {
	sentCount    int64
	errorCount   int64
	pendingCount int64
}

func InitAsyncProducer(brokers []string) error {
	config := sarama.NewConfig()
	config.Version = sarama.V2_8_0_0

	// ✅ FIX #5: Đảm bảo message được ghi vào Kafka trước khi shutdown
	config.Producer.Return.Successes = true
	config.Producer.Return.Errors = true
	config.Producer.RequiredAcks = sarama.WaitForAll // ✅ Chờ tất cả replica confirm (đảm bảo durability)
	config.Producer.Compression = sarama.CompressionSnappy

	config.Producer.Flush.Messages = 500
	config.Producer.Flush.Frequency = 100 * time.Millisecond
	config.Producer.Flush.MaxMessages = 1000

	config.ChannelBufferSize = 10000
	config.Producer.MaxMessageBytes = 10 * 1024 * 1024

	// ✅ Tăng retry để đảm bảo message được gửi thành công
	config.Producer.Retry.Max = 5
	config.Producer.Retry.Backoff = 200 * time.Millisecond

	config.Net.WriteTimeout = 30 * time.Second
	config.Net.ReadTimeout = 30 * time.Second
	config.Metadata.Retry.Max = 5
	config.Metadata.Retry.Backoff = 250 * time.Millisecond

	// ✅ Enable idempotence để tránh duplicate khi retry
	config.Producer.Idempotent = true
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Net.MaxOpenRequests = 1

	producer, err := sarama.NewAsyncProducer(brokers, config)
	if err != nil {
		return fmt.Errorf("failed to create async producer: %w", err)
	}

	AsyncProducer = producer

	producerWg.Add(3)
	go handleSuccess()
	go handleErrors()
	go monitorMetrics()

	log.Println("✅ Kafka AsyncProducer initialized with guaranteed delivery")
	return nil
}

func handleSuccess() {
	defer producerWg.Done()
	for msg := range AsyncProducer.Successes() {
		atomic.AddInt64(&metrics.sentCount, 1)
		atomic.AddInt64(&metrics.pendingCount, -1)
		_ = msg
	}
}

func handleErrors() {
	defer producerWg.Done()
	for err := range AsyncProducer.Errors() {
		atomic.AddInt64(&metrics.errorCount, 1)
		atomic.AddInt64(&metrics.pendingCount, -1)
		log.Printf("❌ Kafka error: topic=%s, partition=%d, offset=%d, err=%v",
			err.Msg.Topic, err.Msg.Partition, err.Msg.Offset, err.Err)
	}
}

func monitorMetrics() {
	defer producerWg.Done()
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		sent := atomic.LoadInt64(&metrics.sentCount)
		errors := atomic.LoadInt64(&metrics.errorCount)
		pending := atomic.LoadInt64(&metrics.pendingCount)

		log.Printf("📊 Kafka Metrics: Sent=%d, Errors=%d, Pending=%d", sent, errors, pending)

		if pending > 5000 {
			log.Printf("⚠️  WARNING: High pending messages: %d", pending)
		}
	}
}

// ======================== FIX #4: Retry logic với timeout dài hơn ========================
func SendMessageAsync(topic, key, value string) error {
	pending := atomic.LoadInt64(&metrics.pendingCount)
	if pending > 20000 {
		return fmt.Errorf("backpressure: too many pending messages (%d)", pending)
	}

	msg := &sarama.ProducerMessage{
		Topic: topic,
		Key:   sarama.StringEncoder(key),
		Value: sarama.StringEncoder(value),
	}

	atomic.AddInt64(&metrics.pendingCount, 1)

	// ✅ FIX: Tăng timeout lên 30s và retry
	maxRetries := 3
	for retry := 0; retry < maxRetries; retry++ {
		select {
		case AsyncProducer.Input() <- msg:
			return nil
		case <-time.After(30 * time.Second): // ✅ Timeout 30s
			if retry < maxRetries-1 {
				log.Printf("⚠️ Retry %d/%d: Failed to send message to Kafka", retry+1, maxRetries)
				time.Sleep(time.Duration(retry+1) * 100 * time.Millisecond)
				continue
			}
			atomic.AddInt64(&metrics.pendingCount, -1)
			return fmt.Errorf("timeout after %d retries", maxRetries)
		}
	}

	return fmt.Errorf("failed to send message after %d retries", maxRetries)
}

func GetMetrics() (sent, errors, pending int64) {
	return atomic.LoadInt64(&metrics.sentCount),
		atomic.LoadInt64(&metrics.errorCount),
		atomic.LoadInt64(&metrics.pendingCount)
}

// ======================== FIX #5: Graceful shutdown với flush đồng bộ ========================
func CloseProducer() error {
	var closeErr error
	shutdownOnce.Do(func() {
		if AsyncProducer != nil {
			log.Println("🔄 Closing Kafka producer...")

			// ✅ FIX: Đợi tất cả pending message được gửi
			startPending := atomic.LoadInt64(&metrics.pendingCount)
			log.Printf("⏳ Waiting for %d pending messages to be sent...", startPending)

			// Đợi tối đa 60s để gửi hết message
			timeout := time.After(60 * time.Second)
			ticker := time.NewTicker(1 * time.Second)
			defer ticker.Stop()

		waitLoop:
			for {
				pending := atomic.LoadInt64(&metrics.pendingCount)
				if pending == 0 {
					break
				}

				select {
				case <-ticker.C:
					log.Printf("⏳ Still waiting: %d pending messages...", pending)
				case <-timeout:
					log.Printf("⚠️ Timeout: %d messages still pending", pending)
					break waitLoop
				}
			}

			// Close producer
			if err := AsyncProducer.Close(); err != nil {
				log.Printf("❌ Error closing producer: %v", err)
				closeErr = err
			}

			// Đợi background handlers
			producerWg.Wait()

			sent := atomic.LoadInt64(&metrics.sentCount)
			errors := atomic.LoadInt64(&metrics.errorCount)
			finalPending := atomic.LoadInt64(&metrics.pendingCount)

			log.Printf("✅ Kafka producer closed: Sent=%d, Errors=%d, Lost=%d",
				sent, errors, finalPending)
		}
	})
	return closeErr
}

// ======================== Health check ========================
func IsHealthy() bool {
	if AsyncProducer == nil {
		return false
	}

	pending := atomic.LoadInt64(&metrics.pendingCount)
	errors := atomic.LoadInt64(&metrics.errorCount)

	// Nếu quá nhiều pending hoặc error rate cao → unhealthy
	if pending > 10000 || errors > 100 {
		return false
	}

	return true
}
