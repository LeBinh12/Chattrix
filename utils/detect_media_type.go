package utils

import "my-app/modules/chat/models"

func DetectMediaType(contentType string) models.MediaType {
	switch {
	case contentType == "image/jpeg" || contentType == "image/png":
		return models.TypeImage
	case contentType == "video/mp4":
		return models.TypeVideo
	default:
		return models.TypeFile
	}
}
