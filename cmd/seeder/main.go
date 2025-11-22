package main

import (
	"context"
	"log"
	"time"

	"my-app/config"
	"my-app/database"
	"my-app/modules/user/models"
	"my-app/modules/user/storage"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type (
	seedUser struct {
		Username    string
		Email       string
		DisplayName string
		Avatar      string
		Phone       string
		Gender      string
		Birthday    time.Time
	}

	userStore interface {
		FindByUsername(ctx context.Context, username string) (*models.User, error)
		Create(ctx context.Context, data *models.User) error
	}
)

func main() {
	cfg := config.LoadAppConfig()
	ctx := context.Background()

	db, err := database.ConnectMongo(ctx, cfg.Mongo.URI, cfg.Mongo.Name)
	if err != nil {
		log.Fatalf("failed to connect mongo: %v", err)
	}

	store := storage.NewMongoStore(db)

	users := []seedUser{
		{
			Username:    "admin",
			Email:       "admin@example.com",
			DisplayName: "Administrator",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
			Phone:       "0900000001",
			Gender:      "other",
			Birthday:    time.Date(1995, time.January, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "user",
			Email:       "user@example.com",
			DisplayName: "User Demo",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=user",
			Phone:       "0900000002",
			Gender:      "other",
			Birthday:    time.Date(1998, time.January, 1, 0, 0, 0, 0, time.UTC),
		},
	}

	const defaultPassword = "123456"

	for _, u := range users {
		if _, err := store.FindByUsername(ctx, u.Username); err == nil {
			log.Printf("user %s already exists, skip seeding", u.Username)
			continue
		} else if err != mongo.ErrNoDocuments {
			log.Fatalf("failed to check user %s: %v", u.Username, err)
		}

		if err := createUser(ctx, store, u, defaultPassword); err != nil {
			log.Fatalf("failed to create %s: %v", u.Username, err)
		}

		log.Printf("seeded user %s with default password %s", u.Username, defaultPassword)
	}

	log.Println("user seeding completed")
}

func createUser(ctx context.Context, store userStore, user seedUser, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	now := time.Now()

	record := &models.User{
		Username:               user.Username,
		Password:               string(hash),
		Email:                  user.Email,
		Avatar:                 user.Avatar,
		Phone:                  user.Phone,
		DisplayName:            user.DisplayName,
		Birthday:               user.Birthday,
		Gender:                 user.Gender,
		IsCompletedFriendSetup: true,
		IsProfileComplete:      true,
	}

	record.ID = primitive.NewObjectID()
	record.CreatedAt = now
	record.UpdatedAt = now

	return store.Create(ctx, record)
}
