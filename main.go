package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"my-app/config"
	"my-app/internal/app"
)

func main() {
	cfg := config.LoadAppConfig()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	application, err := app.New(ctx, cfg)
	if err != nil {
		log.Fatalf("failed to bootstrap application: %v", err)
	}

	if err := application.Run(ctx); err != nil {
		log.Fatalf("application stopped with error: %v", err)
	}
}
