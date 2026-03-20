package seeder

import (
	"context"
	"log"
	"time"

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

func Execute(db *mongo.Database) {
	ctx := context.Background()
	store := storage.NewMongoStore(db)

	// 1. Seed Basic Structural Data
	SeedPermissionModules(db)
	SeedPermissions(db)
	SeedRoles(db)

	// 2. Create Users FIRST
	users := []seedUser{
		{
			Username:    "superadmin",
			Email:       "superadmin@example.com",
			DisplayName: "Quản Trị Viên",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin",
			Phone:       "0901000001",
			Gender:      "other",
			Birthday:    time.Date(1990, time.January, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "steven",
			Email:       "steven@gmail.com",
			DisplayName: "Steven",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin",
			Phone:       "0901000001",
			Gender:      "other",
			Birthday:    time.Date(1990, time.January, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "ithelpdesk1",
			Email:       "ithelpdesk1@example.com",
			DisplayName: "IT helpdesk 1",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin",
			Phone:       "0901000001",
			Gender:      "other",
			Birthday:    time.Date(1990, time.January, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "ithelpdesk2",
			Email:       "ithelpdesk2@example.com",
			DisplayName: "IT helpdesk 2",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin",
			Phone:       "0901000001",
			Gender:      "other",
			Birthday:    time.Date(1990, time.January, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "ithelpdesk3",
			Email:       "ithelpdesk3@example.com",
			DisplayName: "IT helpdesk 3",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin",
			Phone:       "0901000001",
			Gender:      "other",
			Birthday:    time.Date(1990, time.January, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "ithelpdesk4",
			Email:       "ithelpdesk4@example.com",
			DisplayName: "IT helpdesk 4",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin",
			Phone:       "0901000001",
			Gender:      "other",
			Birthday:    time.Date(1990, time.January, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			Username:    "ithelpdesk5",
			Email:       "ithelpdesk5@example.com",
			DisplayName: "IT helpdesk 5",
			Avatar:      "https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin",
			Phone:       "0901000001",
			Gender:      "other",
			Birthday:    time.Date(1990, time.January, 1, 0, 0, 0, 0, time.UTC),
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

	// 3. Seed Relationships (now that users exist)
	SeedRolePermissions(db)
	SeedUserRoles(db) // This will assign roles to normal users

	// Note: SeedRoles(db) already contains logic to assign 'system_admin' to 'superadmin'
	// We call it again to ensure assignment happens now that superadmin exists.
	SeedRoles(db)

	log.Println("seeding completed")
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
