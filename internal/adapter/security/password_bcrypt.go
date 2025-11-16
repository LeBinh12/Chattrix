package security

import "golang.org/x/crypto/bcrypt"

type BcryptChecker struct{}

func NewBcryptChecker() *BcryptChecker { return &BcryptChecker{} }

func (b *BcryptChecker) Compare(hashed, plain string) error {
    return bcrypt.CompareHashAndPassword([]byte(hashed), []byte(plain))
}
