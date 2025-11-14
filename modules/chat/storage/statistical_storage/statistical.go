package statisticalstorage

import "go.mongodb.org/mongo-driver/mongo"

type MongoStatisticalStore struct {
	db *mongo.Database
}

func NewMongoStatisticalStore(db *mongo.Database) *MongoStatisticalStore {
	return &MongoStatisticalStore{db: db}
}
