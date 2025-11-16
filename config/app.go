package config

import (
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type (
	AppConfig struct {
		HTTPAddress string
		Mongo       MongoConfig
		Kafka       KafkaConfig
		Static      StaticConfig
	}

	MongoConfig struct {
		URI  string
		Name string
	}

	KafkaConfig struct {
		Brokers []string
		GroupID string
		Topics  []string
	}

	StaticConfig struct {
		RootDir   string
		AssetsDir string
		LogoPath  string
	}
)

func LoadAppConfig() AppConfig {
	// Load .env if present; ignore errors so it still works in production environments.
	_ = godotenv.Load()

	return AppConfig{
		HTTPAddress: getEnv("HTTP_ADDRESS", "0.0.0.0:3000"),
		Mongo: MongoConfig{
			URI:  getEnv("MONGO_URI", "mongodb://localhost:27017"),
			Name: getEnv("MONGO_DB", "chattrix"),
		},
		Kafka: KafkaConfig{
			Brokers: splitAndTrim(getEnv("KAFKA_BROKERS", "localhost:9092")),
			GroupID: getEnv("KAFKA_GROUP_ID", "chat-group"),
			Topics: splitAndTrim(
				getEnv("KAFKA_TOPICS", strings.Join([]string{
					"chat-topic",
					"update-status-message",
					"user-status-topic",
					"group-out",
					"delete-message-for-me-topic",
				}, ",")),
			),
		},
		Static: StaticConfig{
			RootDir:   getEnv("SPA_ROOT", "./website/dist"),
			AssetsDir: getEnv("SPA_ASSETS", "./website/dist/assets"),
			LogoPath:  getEnv("SPA_LOGO", "./website/dist/vite.svg"),
		},
	}
}

func splitAndTrim(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

// DurationEnv returns a duration parsed from the given environment variable.
func DurationEnv(key string, fallback time.Duration) time.Duration {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		if parsed, err := time.ParseDuration(value); err == nil {
			return parsed
		}
	}
	return fallback
}
