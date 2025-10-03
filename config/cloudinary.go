package config

import (
	"log"
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/joho/godotenv"
)

var CLD *cloudinary.Cloudinary

func InitCloudinary() {
	var err error
	_ = godotenv.Load()

	CLD, err = cloudinary.NewFromParams(
		os.Getenv("CLOUDINARY_CLOUD_NAME"),
		os.Getenv("CLOUDINARY_API_KEY"),
		os.Getenv("CLOUDINARY_API_SECRET"),
	)

	if err != nil {
		log.Fatalf("Failed to initialize Cloudinary: %v", err)
	}
}
