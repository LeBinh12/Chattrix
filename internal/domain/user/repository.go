package user

import (
	"context"
	"errors"
	"time"
)

var ErrUserNotFound = errors.New("Không tìm thấy người dùng")

// Repository abstracts persistence of users.
// Implementations live in adapter layers (e.g., MongoDB).
type Repository interface {
	FindByUsername(ctx context.Context, username string) (*User, error)
	GetRoles(ctx context.Context, userID string) ([]string, error)
	UpdateLoginMetadata(ctx context.Context, userID string, failedAttempts int, lockedUntil *time.Time) error
	ResetLoginMetadata(ctx context.Context, userID string) error
}
