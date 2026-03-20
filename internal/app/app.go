package app

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"my-app/common/kafka"
	"my-app/config"
	"my-app/database"
	"my-app/internal/seeder"
	"my-app/modules/chat/storage"
	chatws "my-app/modules/chat/transport/websocket"
	"my-app/modules/loadtest"
	"my-app/utils"

	"github.com/elastic/go-elasticsearch/v8"
)

type Application struct {
	cfg        config.AppConfig
	server     *http.Server
	kafkaStop  context.CancelFunc
	kafkaErrCh chan error
	ESClient   *elasticsearch.Client
}

func New(ctx context.Context, cfg config.AppConfig) (*Application, error) {
	if err := utils.RegisterValidator(); err != nil {
		return nil, err
	}

	config.InitCloudinary()
	config.InitMinio()
	esClient := cfg.NewESClient()

	db, err := database.ConnectMongo(ctx, cfg.Mongo.URI, cfg.Mongo.Name)
	if err != nil {
		return nil, err
	}
	loadtest.SetDB(db)

	// Auto-seed data if not exists
	go func() {
		log.Println("Checking database seeding...")
		seeder.Execute(db)
		log.Println("Ensuring database indexes...")
		storage.EnsureChatIndexes(ctx, db)
	}()

	if err := kafka.InitAsyncProducer(cfg.Kafka.Brokers); err != nil {
		log.Printf("❌ Failed to init async producer: %v", err)
	}

	consumerCtx, cancel := context.WithCancel(context.Background())
	kafkaErrCh := make(chan error, 1)
	go func() {
		if err := kafka.StartConsumer(consumerCtx, cfg.Kafka.Brokers, cfg.Kafka.GroupID, cfg.Kafka.Topics, db, esClient); err != nil &&
			!errors.Is(err, context.Canceled) {
			kafkaErrCh <- err
		}
	}()

	hub := chatws.NewHub(db)
	go hub.Run()

	router := buildRouter(cfg, db, hub)
	server := &http.Server{
		Addr:              cfg.HTTPAddress,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	return &Application{
		cfg:        cfg,
		server:     server,
		kafkaStop:  cancel,
		kafkaErrCh: kafkaErrCh,
		ESClient:   esClient,
	}, nil
}

func (a *Application) Run(ctx context.Context) error {
	errCh := make(chan error, 1)
	go func() {
		if err := a.server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case <-ctx.Done():
		return a.shutdown(context.Background())
	case err := <-errCh:
		if err != nil {
			_ = a.shutdown(context.Background())
			return err
		}
	case err := <-a.kafkaErrCh:
		if err != nil {
			log.Printf("⚠️ Kafka Consumer Error (Running without Kafka): %v", err)
			// Do not shutdown
			// _ = a.shutdown(context.Background())
			// return err
		}
	}

	return nil
}

func (a *Application) shutdown(ctx context.Context) error {
	a.kafkaStop()

	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := a.server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	return nil
}
