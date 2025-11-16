package user

import (
    "context"
    dom "my-app/internal/domain/user"
    m "my-app/modules/user/models"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
)

type MongoRepository struct {
    db *mongo.Database
}

func NewMongoRepository(db *mongo.Database) *MongoRepository {
    return &MongoRepository{db: db}
}

func (r *MongoRepository) FindByUsername(ctx context.Context, username string) (*dom.User, error) {
    var doc m.User
    if err := r.db.Collection("users").FindOne(ctx, bson.M{"username": username}).Decode(&doc); err != nil {
        return nil, err
    }
    u := &dom.User{
        ID:       doc.ID.Hex(),
        Username: doc.Username,
        Email:    doc.Email,
        Password: doc.Password,
    }
    return u, nil
}
