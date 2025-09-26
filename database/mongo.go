package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var TodoCollection *mongo.Collection

func ConnectMongo() *mongo.Database {
	_ = godotenv.Load()

	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		log.Fatalln("⚠️ Missing MONGO_URI environment variable")
	}

	dbName := os.Getenv("MONGO_DB")
	if dbName == "" {
		dbName = "todo_app"
	}

	client, err := mongo.NewClient(options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatalln("❌ Cannot create Mongo client:", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = client.Connect(ctx)
	if err != nil {
		log.Fatalln("❌ Cannot connect MongoDB:", err)
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatalln("❌ MongoDB not responding:", err)
	}

	fmt.Println("✅ Connected to MongoDB")

	return client.Database(dbName)
}
