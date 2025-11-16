package app

import (
	"context"
	"errors"
	"net/http"
	"time"

	"my-app/common/kafka"
	"my-app/config"
	"my-app/database"
	chatws "my-app/modules/chat/transport/websocket"
	"my-app/utils"
)

type Application struct {
	cfg        config.AppConfig
	server     *http.Server
	kafkaStop  context.CancelFunc
	kafkaErrCh chan error
}

func New(ctx context.Context, cfg config.AppConfig) (*Application, error) {
	if err := utils.RegisterValidator(); err != nil {
		return nil, err
	}

	config.InitCloudinary()
	config.InitMinio()

	db, err := database.ConnectMongo(ctx, cfg.Mongo.URI, cfg.Mongo.Name)
	if err != nil {
		return nil, err
	}

	kafka.InitProducer(cfg.Kafka.Brokers)

	consumerCtx, cancel := context.WithCancel(context.Background())
	kafkaErrCh := make(chan error, 1)
	go func() {
		if err := kafka.StartConsumer(consumerCtx, cfg.Kafka.Brokers, cfg.Kafka.GroupID, cfg.Kafka.Topics, db); err != nil &&
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
			_ = a.shutdown(context.Background())
			return err
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
