package user

import (
	"context"
	"testing"

	dom "my-app/internal/domain/user"
)

type mockRepo struct {
	dom.Repository
	findByUsernameFunc func(username string) (*dom.User, error)
}

func (m *mockRepo) FindByUsername(ctx context.Context, username string) (*dom.User, error) {
	return m.findByUsernameFunc(username)
}

func TestLoginUsecase_Execute_UserNotFound(t *testing.T) {
	repo := &mockRepo{
		findByUsernameFunc: func(username string) (*dom.User, error) {
			return nil, dom.ErrUserNotFound
		},
	}
	uc := NewLoginUsecase(repo, nil, nil)

	_, err := uc.Execute(context.Background(), "unknown", "password")

	if err == nil {
		t.Fatal("expected error, got nil")
	}

	expected := "Sai tài khoản hoặc mật khẩu"
	if err.Error() != expected {
		t.Errorf("expected error message %q, got %q", expected, err.Error())
	}
}
