package biz

import (
	"context"
	"fmt"
	"my-app/modules/user/models"
	"net/mail"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type RegisterStorage interface {
	Create(ctx context.Context, data *models.User) error
	FindByUsername(ctx context.Context, username string) (*models.User, error)
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByPhone(ctx context.Context, phone string) (*models.User, error)
}

type RegisterBiz struct {
	store RegisterStorage
}

func NewRegisterBiz(store RegisterStorage) *RegisterBiz {
	return &RegisterBiz{store: store}
}

// validateEmail validates email format according to RFC standards
func validateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("Email không được để trống")
	}

	// Use standard RFC 5322 validation
	_, err := mail.ParseAddress(email)
	if err != nil {
		return fmt.Errorf("Email không hợp lệ")
	}

	return nil
}

// validatePhone validates phone number format
func validatePhone(phone string) error {
	if phone == "" {
		return fmt.Errorf("Số điện thoại không được để trống")
	}

	// Vietnamese phone number: starts with 0 or +84, followed by 9 digits
	phoneRegex := `^(0|\+84)[0-9]{9}$`
	match, _ := regexp.MatchString(phoneRegex, phone)
	if !match {
		return fmt.Errorf("Số điện thoại không hợp lệ")
	}

	return nil
}

func (biz *RegisterBiz) Register(ctx context.Context, data *models.RegisterRequest) error {
	// ===== STEP 1: Validate input data =====
	if data.Username == "" {
		return fmt.Errorf("Username không được để trống")
	}
	if data.Password == "" {
		return fmt.Errorf("Password không được để trống")
	}
	if data.Email == "" {
		return fmt.Errorf("Email không được để trống")
	}

	// Validate email format
	if err := validateEmail(data.Email); err != nil {
		return err
	}

	// Validate phone if provided
	if data.Phone != "" {
		if err := validatePhone(data.Phone); err != nil {
			return err
		}
	}

	// ===== STEP 2: Check for duplicate username =====
	existingUserByUsername, err := biz.store.FindByUsername(ctx, data.Username)
	if err == nil && existingUserByUsername != nil {
		return fmt.Errorf("Username đã tồn tại")
	}

	// ===== STEP 3: Check for duplicate email =====
	existingUserByEmail, err := biz.store.FindByEmail(ctx, data.Email)
	if err == nil && existingUserByEmail != nil {
		return fmt.Errorf("Email đã tồn tại")
	}

	// ===== STEP 4: Check for duplicate phone =====
	if data.Phone != "" {
		existingUserByPhone, err := biz.store.FindByPhone(ctx, data.Phone)
		if err == nil && existingUserByPhone != nil {
			return fmt.Errorf("Số điện thoại đã tồn tại")
		}
	}

	// ===== STEP 5: Create user if all validations pass =====
	hash, _ := bcrypt.GenerateFromPassword([]byte(data.Password), bcrypt.DefaultCost)

	now := time.Now()

	displayName := data.DisplayName

	if displayName == "" {
		displayName = data.Username
	}
	user := &models.User{
		Username:               data.Username,
		Email:                  data.Email,
		Avatar:                 data.Avatar,
		Phone:                  data.Phone,
		DisplayName:            displayName,
		Password:               string(hash),
		Gender:                 data.Gender,
		Birthday:               data.Birthday,
		IsCompletedFriendSetup: false,
		IsProfileComplete:      true,
		Type:                   data.Type,
		Description:            data.Description,
	}

	user.ID = primitive.NewObjectID()
	user.CreatedAt = now
	user.UpdatedAt = now
	return biz.store.Create(ctx, user)
}

func (biz *RegisterBiz) RegisterChannel(ctx context.Context, data *models.RegisterRequest) ([]*models.ChanelNotificationResponse, error) {
	// ===== STEP 1: Validate input data =====
	if data.Username == "" {
		return nil, fmt.Errorf("Username không được để trống")
	}
	if data.Password == "" {
		return nil, fmt.Errorf("Password không được để trống")
	}
	if data.Email == "" {
		return nil, fmt.Errorf("Email không được để trống")
	}

	// Validate email format
	if err := validateEmail(data.Email); err != nil {
		return nil, err
	}

	// ===== STEP 2: Check for duplicate username =====
	existingUserByUsername, err := biz.store.FindByUsername(ctx, data.Username)
	if err == nil && existingUserByUsername != nil {
		return nil, fmt.Errorf("Username đã tồn tại")
	}

	// ===== STEP 3: Check for duplicate email =====
	existingUserByEmail, err := biz.store.FindByEmail(ctx, data.Email)
	if err == nil && existingUserByEmail != nil {
		return nil, fmt.Errorf("Email đã tồn tại")
	}

	// ===== STEP 4: Create user if all validations pass =====
	hash, _ := bcrypt.GenerateFromPassword([]byte(data.Password), bcrypt.DefaultCost)

	now := time.Now()

	displayName := data.DisplayName

	if displayName == "" {
		displayName = data.Username
	}
	user := &models.User{
		Username:               data.Username,
		Email:                  data.Email,
		Avatar:                 data.Avatar,
		Phone:                  data.Phone,
		DisplayName:            displayName,
		Password:               string(hash),
		Gender:                 data.Gender,
		Birthday:               data.Birthday,
		IsCompletedFriendSetup: false,
		IsProfileComplete:      true,
		Type:                   data.Type,
		Description:            data.Description,
	}

	user.ID = primitive.NewObjectID()
	user.CreatedAt = now
	user.UpdatedAt = now
	if err := biz.store.Create(ctx, user); err != nil {
		return nil, err // Trả về lỗi nếu lưu thất bại
	}

	// Chuyển sang response format sạch
	response := &models.ChanelNotificationResponse{
		ID:          user.ID.Hex(),
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Avatar:      user.Avatar,
		Description: user.Description,
		Type:        user.Type,
		CreatedAt:   user.CreatedAt.Unix(),
		UpdatedAt:   user.UpdatedAt.Unix(),
	}

	// Trả về danh sách chứa 1 phần tử (dễ mở rộng sau nếu tạo nhiều)
	return []*models.ChanelNotificationResponse{response}, nil
}
