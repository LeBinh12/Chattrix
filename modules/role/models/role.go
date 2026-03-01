package models

import (
	"my-app/common"
	"time"
)

type Role struct {
	common.MongoModel `bson:",inline"`
	Code 				string     `bson:"code" json:"code"`
	Name              string     `bson:"name" json:"name"`
	Description       string     `bson:"description" json:"description"`
	IsDeleted         bool       `bson:"is_deleted" json:"is_deleted"`
	DeletedAt         *time.Time `bson:"deleted_at,omitempty" json:"deleted_at,omitempty"`
}

// DTO cho tạo role mới
type CreateRoleRequest struct {
	Code        string `json:"code" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// DTO cho update role
type UpdateRoleRequest struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// DTO cho response role
type RoleResponse struct {
	ID          string    `json:"id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Convert Role to RoleResponse
func (r *Role) ToResponse() *RoleResponse {
	return &RoleResponse{
		ID:          r.ID.Hex(),
		Code:        r.Code,
		Name:        r.Name,
		Description: r.Description,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
}