package database

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var TodoCollection *mongo.Collection

func ConnectMongo(ctx context.Context, uri, dbName string) (*mongo.Database, error) {
	if uri == "" {
		return nil, errors.New("mongo uri is required")
	}

	if dbName == "" {
		return nil, errors.New("mongo database name is required")
	}

	client, err := mongo.NewClient(options.Client().ApplyURI(uri))
	if err != nil {
		return nil, fmt.Errorf("cannot create mongo client: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := client.Connect(ctx); err != nil {
		return nil, fmt.Errorf("cannot connect to mongo: %w", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("mongo ping failed: %w", err)
	}

	fmt.Println("Connected to MongoDB")
	return client.Database(dbName), nil
}
