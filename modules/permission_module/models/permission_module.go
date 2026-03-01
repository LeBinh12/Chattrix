package models

import (
	"my-app/common"
	"time"
)

type PermissionModule struct {
	common.MongoModel `bson:",inline"`
	Code              string     `bson:"code" json:"code"`
	Name              string     `bson:"name" json:"name"`
	Description       string     `bson:"description" json:"description"`
	DisplayOrder      int        `bson:"display_order" json:"display_order"`
	DeletedAt         *time.Time `bson:"deleted_at,omitempty" json:"deleted_at,omitempty"`
}

// DTO cho tạo module mới
type CreateModuleRequest struct {
	Code         string `json:"code" binding:"required"`
	Name         string `json:"name" binding:"required"`
	Description  string `json:"description"`
	DisplayOrder int    `json:"display_order"`
}

// DTO cho update module
type UpdateModuleRequest struct {
	Code         string `json:"code"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	DisplayOrder int    `json:"display_order"`
}

// DTO cho response module
type ModuleResponse struct {
	ID           string    `json:"id"`
	Code         string    `json:"code"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	DisplayOrder int       `json:"display_order"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Convert PermissionModule to ModuleResponse
func (m *PermissionModule) ToResponse() *ModuleResponse {
	return &ModuleResponse{
		ID:           m.ID.Hex(),
		Code:         m.Code,
		Name:         m.Name,
		Description:  m.Description,
		DisplayOrder: m.DisplayOrder,
		CreatedAt:    m.CreatedAt,
		UpdatedAt:    m.UpdatedAt,
	}
}
