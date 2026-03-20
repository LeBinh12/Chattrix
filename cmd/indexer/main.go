package main

import (
	"context"
	"log"

	"my-app/config"
	"my-app/database"
	"my-app/internal/indexer"
)

func main() {
	cfg := config.LoadAppConfig()
	ctx := context.Background()

	db, err := database.ConnectMongo(ctx, cfg.Mongo.URI, cfg.Mongo.Name)
	if err != nil {
		log.Fatalf("failed to connect mongo: %v", err)
	}

	log.Println("🚀 Starting database indexing...")
	indexer.Execute(db)
	log.Println("✨ Database indexing finished.")
}
