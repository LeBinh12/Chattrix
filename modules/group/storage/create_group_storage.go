package storage

import "go.mongodb.org/mongo-driver/mongo"

type mongoStoreGroup struct {
	db *mongo.Database
}

func NewMongoStoreGroup(db *mongo.Database) *mongoStoreGroup {
	return &mongoStoreGroup{db: db}
}
