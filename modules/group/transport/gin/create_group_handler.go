package ginGroup

import (
	"my-app/common"
	"my-app/modules/group/biz"
	"my-app/modules/group/models"
	"my-app/modules/group/storage"
	"my-app/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func CreateGroupHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {

		name := c.PostForm("name")
		status := c.PostForm("status")

		avatarGroup, _ := c.FormFile("image")
		var avatarURL string

		if avatarGroup != nil {
			if err := utils.ValidateAndSaveFile(avatarGroup); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			file, _ := avatarGroup.Open()

			url, err := utils.UploadFileToMinio(file, avatarGroup)
			if err != nil {
				c.JSON(http.StatusInternalServerError, common.ErrDB(err))
				return
			}
			avatarURL = url
		} else {
			avatarURL = "null"
		}

		createBy, exists := c.Get("userID")

		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Không tìm thấy userID trong context"})
			return
		}

		createByStr, ok := createBy.(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "userID không hợp lệ"})
			return
		}

		objID, err := primitive.ObjectIDFromHex(createByStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "userID không phải ObjectID hợp lệ"})
			return
		}

		data := models.Group{
			Name:      name,
			Image:     avatarURL,
			Status:    status,
			CreatorID: objID,
		}
		store := storage.NewMongoStoreGroup(db)
		business := biz.NewCreateGroupBiz(store)

		if err := business.Create(c, &data); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		member := models.GroupMember{
			GroupID:  data.ID,
			UserID:   objID,
			Role:     "owner", // hoặc "admin"
			Status:   "active",
			JoinedAt: time.Now(),
		}

		if err := store.CreateGroupNumber(c, &member); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Tạo nhóm thành công nhưng không thể thêm creator vào group_members: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Thêm nhóm thành công", data.ID.Hex()))
	}
}
