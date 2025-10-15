package models

import "go.mongodb.org/mongo-driver/bson/primitive"

var members []struct {
	UserID primitive.ObjectID `bson:"user_id"`
}
