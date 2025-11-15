package ginUser

import (
	"encoding/json"
	"fmt"
	"io"
	"my-app/common"
	"my-app/modules/user/biz"
	"my-app/modules/user/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/oauth2"
)

// ĐỊnh dạng lại
type OpenIddictUserInfo struct {
	Sub            string   `json:"sub"`                                                                  // User ID
	Name           string   `json:"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"`           // Username
	Email          string   `json:"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"`   // Email
	NameIdentifier string   `json:"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"` // User ID (duplicate)
	Role           string   `json:"http://schemas.microsoft.com/ws/2008/06/identity/claims/role"`         // Role
	Permissions    []string `json:"permission"`                                                           // Permissions array
	Scope          string   `json:"scope"`                                                                // Scopes
	Issuer         string   `json:"iss"`                                                                  // Issuer
	ClientId       string   `json:"client_id"`                                                            // Client ID
	ExpiresAt      string   `json:"exp"`                                                                  // Expiration timestamp
	IssuedAt       string   `json:"iat"`                                                                  // Issued at timestamp
	SecurityStamp  string   `json:"AspNet.Identity.SecurityStamp"`                                        // Security stamp
}

type UserResponse struct {
	UserID      string   `json:"user_id"`
	Username    string   `json:"username"`
	Email       string   `json:"email"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}

func OpenIddictCallbackHandler(db *mongo.Database) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var req struct {
			Code         string `json:"code"`
			CodeVerifier string `json:"code_verifier"`
		}
		if err := ctx.ShouldBindJSON(&req); err != nil {
			ctx.JSON(http.StatusBadRequest, common.NewResponse(400, "Thiếu code hoặc code_verifier", nil))
			return
		}

		oauth2Config := &oauth2.Config{
			ClientID:     "chat-system",
			ClientSecret: "",
			RedirectURL:  "http://localhost:3000/auth/opendict/callback",
			Endpoint: oauth2.Endpoint{
				AuthURL:  "http://localhost:9005/connect/authorize",
				TokenURL: "http://localhost:9005/connect/token",
			},
			Scopes: []string{"openid", "profile", "email"},
		}

		// Exchange token với PKCE
		oauth2Token, err := oauth2Config.Exchange(
			ctx,
			req.Code,
			oauth2.SetAuthURLParam("code_verifier", req.CodeVerifier),
		)
		if err != nil {
			ctx.JSON(http.StatusUnauthorized, common.NewResponse(401, "Giải mã code không thành công: "+err.Error(), nil))
			return
		}

		// Lấy UserInfo từ OpenIddict endpoint (Cách tốt nhất)
		userInfo, err := getUserInfoFromOpenIddict(oauth2Token.AccessToken)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, common.NewResponse(500, "Không lấy được thông tin user: "+err.Error(), nil))
			return
		}

		userData := extractUserData(userInfo)

		store := storage.NewMongoStore(db)
		business := biz.NewOpenIdDictStoreLoginBiz(store)
		token, err := business.LoginOrRegisterByOpenIdDict(ctx.Request.Context(), userData.Email)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
			return
		}

		ctx.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Đăng nhập thành công", token))
	}
}

// Gọi UserInfo endpoint của OpenIddict để lấy claims
func getUserInfoFromOpenIddict(accessToken string) (map[string]interface{}, error) {
	userInfoURL := "http://localhost:9005/connect/userinfo"

	req, err := http.NewRequest("GET", userInfoURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("userinfo endpoint error: %s - %s", resp.Status, string(body))
	}

	var userInfo map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	return userInfo, nil
}

// Extract user data từ claims
func extractUserData(claims map[string]interface{}) UserResponse {
	userData := UserResponse{}

	// Lấy user ID
	if sub, ok := claims["sub"].(string); ok {
		userData.UserID = sub
	}

	// Lấy username
	if name, ok := claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"].(string); ok {
		userData.Username = name
	}

	//  Lấy email
	if email, ok := claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"].(string); ok {
		userData.Email = email
	}

	// Lấy role
	if role, ok := claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"].(string); ok {
		userData.Role = role
	}

	//  Lấy permissions (array)
	if permissions, ok := claims["permission"].([]interface{}); ok {
		userData.Permissions = make([]string, len(permissions))
		for i, perm := range permissions {
			if permStr, ok := perm.(string); ok {
				userData.Permissions[i] = permStr
			}
		}
	}

	return userData
}
