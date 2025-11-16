package security

import "my-app/utils"

type JWTIssuer struct{}

func NewJWTIssuer() *JWTIssuer { return &JWTIssuer{} }

func (j *JWTIssuer) Issue(userID string) (string, error) {
    return utils.GenerateJWT(userID)
}
