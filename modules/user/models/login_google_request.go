package models

type GoogleLoginRequest struct {
	Email     string `json:"email" binding:"required"`
	AvatarURL string `json:"avatar"`
	Name      string `json:"name"`
}
