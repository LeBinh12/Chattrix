package user

import (
	"context"
	"errors"
	"fmt"
	"time"

	dom "my-app/internal/domain/user"
)

// PasswordChecker compares a stored hash with a candidate password.
type PasswordChecker interface {
	Compare(hashed, plain string) error
}

// TokenIssuer issues an access token for the given user id.
type TokenIssuer interface {
	Issue(userID string, roles []string) (string, error)
}

// LoginUsecase orchestrates the login flow.
type LoginUsecase struct {
	repo    dom.Repository
	checker PasswordChecker
	tokens  TokenIssuer
}

func NewLoginUsecase(repo dom.Repository, checker PasswordChecker, tokens TokenIssuer) *LoginUsecase {
	return &LoginUsecase{repo: repo, checker: checker, tokens: tokens}
}

func (uc *LoginUsecase) Execute(ctx context.Context, username, password string) (string, error) {
	u, err := uc.repo.FindByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, dom.ErrUserNotFound) {
			return "", errors.New("Sai tài khoản hoặc mật khẩu")
		}
		return "", err
	}

	// 1. Check if account is locked
	if u.LockedUntil != nil && u.LockedUntil.After(time.Now()) {
		remaining := time.Until(*u.LockedUntil).Round(time.Second)
		minutes := int(remaining.Minutes())
		seconds := int(remaining.Seconds()) % 60
		return "", fmt.Errorf("Tài khoản đã bị khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau %d phút %d giây", minutes, seconds)
	}

	// 2. Validate password
	if err := uc.checker.Compare(u.Password, password); err != nil {
		// Increment failed attempts
		newAttempts := u.FailedAttempts + 1
		var lockedUntil *time.Time

		if newAttempts >= 5 {
			t := time.Now().Add(15 * time.Minute)
			lockedUntil = &t
		}

		_ = uc.repo.UpdateLoginMetadata(ctx, u.ID, newAttempts, lockedUntil)

		if newAttempts >= 5 {
			return "", errors.New("Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút")
		}

		return "", errors.New("Sai tài khoản hoặc mật khẩu")
	}

	// 3. Reset metadata on success
	if u.FailedAttempts > 0 || u.LockedUntil != nil {
		_ = uc.repo.ResetLoginMetadata(ctx, u.ID)
	}

	roles, err := uc.repo.GetRoles(ctx, u.ID)
	if err != nil {
		roles = []string{}
	}

	token, err := uc.tokens.Issue(u.ID, roles)
	if err != nil {
		return "", err
	}
	return token, nil
}
