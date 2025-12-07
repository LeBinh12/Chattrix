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

	// users := []seedUser{
	// 	{
	// 		Username:    "admin",
	// 		Email:       "admin@example.com",
	// 		DisplayName: "Administrator",
	// 		Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
	// 		Phone:       "0900000001",
	// 		Gender:      "other",
	// 		Birthday:    time.Date(1995, time.January, 1, 0, 0, 0, 0, time.UTC),
	// 	},
	// 	{
	// 		Username:    "user",
	// 		Email:       "user@example.com",
	// 		DisplayName: "User Demo",
	// 		Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=user",
	// 		Phone:       "0900000002",
	// 		Gender:      "other",
	// 		Birthday:    time.Date(1998, time.January, 1, 0, 0, 0, 0, time.UTC),
	// 	},
	// }

	users := []seedUser{
		{
			Username:    "ulysses",
			Email:       "ulysses@example.com",
			DisplayName: "Ulysses Truong",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=ulysses",
			Phone:       "0900000022",
			Gender:      "male",
			Birthday:    time.Date(1992, 5, 25, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "violet",
			Email:       "violet@example.com",
			DisplayName: "Violet Pham",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=violet",
			Phone:       "0900000023",
			Gender:      "female",
			Birthday:    time.Date(1997, 10, 3, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "walter",
			Email:       "walter@example.com",
			DisplayName: "Walter Dang",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=walter",
			Phone:       "0900000024",
			Gender:      "male",
			Birthday:    time.Date(1993, 12, 12, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "xena",
			Email:       "xena@example.com",
			DisplayName: "Xena Le",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=xena",
			Phone:       "0900000025",
			Gender:      "female",
			Birthday:    time.Date(1996, 8, 8, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "yuki",
			Email:       "yuki@example.com",
			DisplayName: "Yuki Ho",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=yuki",
			Phone:       "0900000026",
			Gender:      "female",
			Birthday:    time.Date(1999, 6, 18, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "zeke",
			Email:       "zeke@example.com",
			DisplayName: "Zeke Tran",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=zeke",
			Phone:       "0900000027",
			Gender:      "male",
			Birthday:    time.Date(1995, 4, 30, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "aaron",
			Email:       "aaron@example.com",
			DisplayName: "Aaron Vo",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=aaron",
			Phone:       "0900000028",
			Gender:      "male",
			Birthday:    time.Date(1992, 1, 14, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "bella",
			Email:       "bella@example.com",
			DisplayName: "Bella Truong",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=bella",
			Phone:       "0900000029",
			Gender:      "female",
			Birthday:    time.Date(1997, 5, 19, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "carlos",
			Email:       "carlos@example.com",
			DisplayName: "Carlos Nguyen",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=carlos",
			Phone:       "0900000030",
			Gender:      "male",
			Birthday:    time.Date(1994, 9, 23, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "dora",
			Email:       "dora@example.com",
			DisplayName: "Dora Le",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=dora",
			Phone:       "0900000031",
			Gender:      "female",
			Birthday:    time.Date(1996, 3, 9, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "edward",
			Email:       "edward@example.com",
			DisplayName: "Edward Hoang",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=edward",
			Phone:       "0900000032",
			Gender:      "male",
			Birthday:    time.Date(1993, 8, 12, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "flora",
			Email:       "flora@example.com",
			DisplayName: "Flora Bui",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=flora",
			Phone:       "0900000033",
			Gender:      "female",
			Birthday:    time.Date(1998, 11, 17, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "gordon",
			Email:       "gordon@example.com",
			DisplayName: "Gordon Do",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=gordon",
			Phone:       "0900000034",
			Gender:      "male",
			Birthday:    time.Date(1991, 10, 5, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "hana",
			Email:       "hana@example.com",
			DisplayName: "Hana Vo",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=hana",
			Phone:       "0900000035",
			Gender:      "female",
			Birthday:    time.Date(1997, 12, 25, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "ian",
			Email:       "ian@example.com",
			DisplayName: "Ian Nguyen",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=ian",
			Phone:       "0900000036",
			Gender:      "male",
			Birthday:    time.Date(1992, 6, 7, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "jasmine",
			Email:       "jasmine@example.com",
			DisplayName: "Jasmine Le",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=jasmine",
			Phone:       "0900000037",
			Gender:      "female",
			Birthday:    time.Date(1999, 1, 28, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "kai",
			Email:       "kai@example.com",
			DisplayName: "Kai Tran",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=kai",
			Phone:       "0900000038",
			Gender:      "male",
			Birthday:    time.Date(1996, 4, 4, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "lola",
			Email:       "lola@example.com",
			DisplayName: "Lola Truong",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=lola",
			Phone:       "0900000039",
			Gender:      "female",
			Birthday:    time.Date(1998, 2, 22, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "mason",
			Email:       "mason@example.com",
			DisplayName: "Mason Bui",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=mason",
			Phone:       "0900000040",
			Gender:      "male",
			Birthday:    time.Date(1995, 7, 27, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "nora",
			Email:       "nora@example.com",
			DisplayName: "Nora Ho",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=nora",
			Phone:       "0900000041",
			Gender:      "female",
			Birthday:    time.Date(1997, 9, 11, 0, 0, 0, 0, time.UTC),
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
