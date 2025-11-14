package utils

import (
	"context"

	"github.com/coreos/go-oidc"
	"golang.org/x/oauth2"
)

type OpenIddictConfig struct {
	Issuer       string
	ClientID     string
	ClientSecret string
	RedirectURI  string
}

func NewOIDCProvider(ctx context.Context, cfg *OpenIddictConfig) (*oidc.Provider, *oauth2.Config, error) {
	// Provider đại diện cho máy chủ OpenIddict của bạn
	provider, err := oidc.NewProvider(ctx, cfg.Issuer)
	if err != nil {
		return nil, nil, err
	}

	oauth2Config := &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  cfg.RedirectURI,
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
	}

	return provider, oauth2Config, nil
}
