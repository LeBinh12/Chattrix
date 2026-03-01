package models

import (
	"my-app/common"
	"time"
)

type Permission struct {
	common.MongoModel `bson:",inline"`
	Code              string     `bson:"code" json:"code"`
	Name              string     `bson:"name" json:"name"`
	Description       string     `bson:"description" json:"description"`
	ModuleID          string     `bson:"module_id,omitempty" json:"module_id,omitempty"`
	DeletedAt         *time.Time `bson:"deleted_at,omitempty" json:"deleted_at,omitempty"`
}

// DTO cho tạo permission mới
type CreatePermissionRequest struct {
	Code        string `json:"code" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	ModuleID    string `json:"module_id"`
}

// DTO cho update permission
type UpdatePermissionRequest struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	ModuleID    string `json:"module_id"`
}

// DTO cho response permission
type PermissionResponse struct {
	ID          string    `json:"id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	ModuleID    string    `json:"module_id,omitempty"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Convert Permission to PermissionResponse
func (p *Permission) ToResponse() *PermissionResponse {
	return &PermissionResponse{
		ID:          p.ID.Hex(),
		Code:        p.Code,
		Name:        p.Name,
		ModuleID:    p.ModuleID,
		Description: p.Description,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}