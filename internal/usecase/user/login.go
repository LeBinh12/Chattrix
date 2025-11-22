package user

import (
    "context"
    dom "my-app/internal/domain/user"
)

// PasswordChecker compares a stored hash with a candidate password.
type PasswordChecker interface {
    Compare(hashed, plain string) error
}

// TokenIssuer issues an access token for the given user id.
type TokenIssuer interface {
    Issue(userID string) (string, error)
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
        return "", err
    }

    if err := uc.checker.Compare(u.Password, password); err != nil {
        return "", err
    }

    token, err := uc.tokens.Issue(u.ID)
    if err != nil {
        return "", err
    }
    return token, nil
}
