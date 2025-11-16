package user

import "context"

// Repository abstracts persistence of users.
// Implementations live in adapter layers (e.g., MongoDB).
type Repository interface {
    FindByUsername(ctx context.Context, username string) (*User, error)
}
