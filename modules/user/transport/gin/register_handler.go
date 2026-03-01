package ginUser

import (
	"fmt"
	"log"
	"my-app/modules/user/biz"
	"my-app/modules/user/models"
	"my-app/modules/user/storage"
	"my-app/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func RegisterHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.PostForm("username")
		password := c.PostForm("password")
		email := c.PostForm("email")
		phone := c.PostForm("phone")
		displayName := c.PostForm("display_name")
		gender := c.PostForm("gender")
		birthdayStr := c.PostForm("birthday")

		// ===== VALIDATION: Birthday format =====
		birthday, err := time.Parse("2006-01-02", birthdayStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Ngày sinh không đúng định dạng (YYYY-MM-DD)",
				"field":   "birthday",
			})
			return
		}

		// ===== VALIDATION: Required fields =====
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Username không được để trống",
				"field":   "username",
			})
			return
		}
		if password == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Password không được để trống",
				"field":   "password",
			})
			return
		}
		if email == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Email không được để trống",
				"field":   "email",
			})
			return
		}

		avatarFile, _ := c.FormFile("avatar")
		var avatarURL string

		if avatarFile != nil {
			if err := utils.ValidateAndSaveFile(avatarFile); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": err.Error(),
					"field":   "avatar",
				})
				return
			}
			file, _ := avatarFile.Open()

			url, err := utils.UploadFileToMinio(file, avatarFile)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "Lỗi upload avatar",
				})
				return
			}
			avatarURL = url
		} else {
			avatarURL = "null"
		}

		req := models.RegisterRequest{
			Username:    username,
			Password:    password,
			Email:       email,
			Phone:       phone,
			DisplayName: displayName,
			Avatar:      avatarURL,
			Gender:      gender,
			Birthday:    birthday,
			Type:        "user",
		}

		if err := utils.ValidateStruct(&req); err != nil {
			c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewRegisterBiz(store)

		// ===== CALL BUSINESS LOGIC =====
		if err := business.Register(c.Request.Context(), &req); err != nil {
			// Handle specific business logic errors
			errMsg := err.Error()
			
			if errMsg == "Username đã tồn tại" {
				c.JSON(http.StatusConflict, gin.H{
					"success": false,
					"message": "Username đã tồn tại",
					"field":   "username",
				})
				return
			}
			
			if errMsg == "Email đã tồn tại" {
				c.JSON(http.StatusConflict, gin.H{
					"success": false,
					"message": "Email đã được sử dụng",
					"field":   "email",
				})
				return
			}
			
			if errMsg == "Email không hợp lệ" {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": "Email không đúng định dạng",
					"field":   "email",
				})
				return
			}

			// Other validation errors from business logic
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": errMsg,
			})
			return
		}

		// ========== TỰ ĐỘNG GÁN ROLE "USER" MẶC ĐỊNH ==========
		log.Printf("🔍 [REGISTER] Starting auto-assign USER role for username: %s", username)

		// Tìm role có code = "user"
		var roleDoc struct {
			ID   primitive.ObjectID `bson:"_id"`
			Code string             `bson:"code"`
			Name string             `bson:"name"`
		}
		err = db.Collection("roles").FindOne(c.Request.Context(), bson.M{"code": "user"}).Decode(&roleDoc)
		if err != nil {
			log.Printf("❌ [REGISTER] Failed to find USER role: %v", err)
			// Still return success since user was created
			c.JSON(http.StatusCreated, gin.H{
				"success": true,
				"message": "Tạo người dùng thành công (nhưng chưa gán role)",
				"data": gin.H{
					"username": username,
					"email":    email,
				},
			})
			return
		}
		log.Printf("✅ [REGISTER] Found USER role - ID: %s, Name: %s", roleDoc.ID.Hex(), roleDoc.Name)

		// Lấy user vừa tạo để có user ID
		var createdUser models.User
		err = db.Collection("users").FindOne(c.Request.Context(), bson.M{"username": username}).Decode(&createdUser)
		if err != nil {
			log.Printf("❌ [REGISTER] Failed to find created user: %v", err)
			c.JSON(http.StatusCreated, gin.H{
				"success": true,
				"message": "Tạo người dùng thành công",
				"data": gin.H{
					"username": username,
					"email":    email,
				},
			})
			return
		}
		log.Printf("✅ [REGISTER] Found created user - ID: %s, Username: %s", createdUser.ID.Hex(), createdUser.Username)

		// Gán role USER vào bảng user_roles
		userRole := bson.M{
			"_id":        primitive.NewObjectID(),
			"user_id":    createdUser.ID,
			"role_id":    roleDoc.ID,
			"created_at": time.Now(),
			"updated_at": time.Now(),
			"is_deleted": false,
		}

		result, insertErr := db.Collection("user_roles").InsertOne(c.Request.Context(), userRole)
		if insertErr != nil {
			log.Printf("❌ [REGISTER] Failed to insert user_role: %v", insertErr)
		} else {
			log.Printf("✅ [REGISTER] Successfully assigned USER role - user_role ID: %s", result.InsertedID.(primitive.ObjectID).Hex())
		}
		// ========== KẾT THÚC GÁN ROLE ==========

		// ===== SUCCESS RESPONSE: 201 Created =====
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"message": "Tạo người dùng thành công",
			"data": gin.H{
				"id":          createdUser.ID.Hex(),
				"username":    createdUser.Username,
				"email":       createdUser.Email,
				"displayName": createdUser.DisplayName,
			},
		})
	}
}

func RegisterChanelNotificationHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		displayName := c.PostForm("display_name")
		description := c.PostForm("description")

		if displayName == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Tên hiển thị không được để trống",
				"field":   "display_name",
			})
			return
		}

		avatarFile, _ := c.FormFile("avatar")
		var avatarURL string

		if avatarFile != nil {
			if err := utils.ValidateAndSaveFile(avatarFile); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": err.Error(),
					"field":   "avatar",
				})
				return
			}
			file, _ := avatarFile.Open()

			url, err := utils.UploadFileToMinio(file, avatarFile)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "Lỗi upload avatar",
				})
				return
			}
			avatarURL = url
		} else {
			avatarURL = "null"
		}

		username := utils.GenerateUsernameFromDisplayName(displayName)
		if username == "" {
			username = "system_notification_" + primitive.NewObjectID().Hex() // đảm bảo unique
		}

		birthday := time.Now()
		req := models.RegisterRequest{
			Username:    username,
			Password:    "dummy_password_123!@#",                         // đủ mạnh để pass validation nếu có rule password
			Email:       fmt.Sprintf("%s@system.notification", username), // ví dụ: thong_bao_he_thong@system.notification
			Phone:       "0000000000",                                    // số giả cố định cho kênh hệ thống
			DisplayName: displayName,
			Avatar:      avatarURL,
			Gender:      "khác",
			Birthday:    birthday,       // thời gian hiện tại
			Type:        "notification", // quan trọng để phân biệt
			Description: description,
		}

		if err := utils.ValidateStruct(&req); err != nil {
			c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}

		store := storage.NewMongoStore(db)
		business := biz.NewRegisterBiz(store)

		responses, err := business.RegisterChannel(c.Request.Context(), &req)
		if err != nil {
			// Handle specific business logic errors
			errMsg := err.Error()
			
			if errMsg == "Username đã tồn tại" {
				c.JSON(http.StatusConflict, gin.H{
					"success": false,
					"message": "Username đã tồn tại",
					"field":   "username",
				})
				return
			}
			
			if errMsg == "Email đã tồn tại" {
				c.JSON(http.StatusConflict, gin.H{
					"success": false,
					"message": "Email đã được sử dụng",
					"field":   "email",
				})
				return
			}
			
			if errMsg == "Email không hợp lệ" {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": "Email không đúng định dạng",
					"field":   "email",
				})
				return
			}

			// Other validation errors
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": errMsg,
			})
			return
		}

		// ===== SUCCESS RESPONSE: 201 Created =====
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"message": "Tạo kênh thông báo thành công",
			"data":    responses,
		})
	}
}
