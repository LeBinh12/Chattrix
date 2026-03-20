package main

import (
	"context"
	"log"

	"my-app/config"
	"my-app/database"
	"my-app/internal/seeder"
)

func main() {
	cfg := config.LoadAppConfig()
	ctx := context.Background()

	db, err := database.ConnectMongo(ctx, cfg.Mongo.URI, cfg.Mongo.Name)
	if err != nil {
		log.Fatalf("failed to connect mongo: %v", err)
	}

	log.Println("Starting database runner...")
	seeder.Execute(db)
	log.Println("Database seeder finished.")
}
