package ginGroup

import (
	"my-app/common"
	"my-app/modules/group/biz"
	"my-app/modules/group/models"
	"my-app/modules/group/storage"
	gurModels "my-app/modules/group_user_role/models"
	gurStorage "my-app/modules/group_user_role/storage"
	roleStorage "my-app/modules/role/storage"
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
			c.JSON(http.StatusUnauthorized, gin.H{"error": "userID not found in context"})
			return
		}

		createByStr, ok := createBy.(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid userID"})
			return
		}

		objID, err := primitive.ObjectIDFromHex(createByStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "userID is not a valid ObjectID"})
			return
		}

		// 1. Check for owner role first
		roleStore := roleStorage.NewMongoStore(db)
		role, err := roleStore.FindByCode(c, "owner")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Owner role not found in system: " + err.Error()})
			return
		}

		// 2. Create Group
		data := models.Group{
			Name:      name,
			Image:     avatarURL,
			Status:    status,
			CreatorID: objID,
		}
		groupStore := storage.NewMongoStoreGroup(db)
		business := biz.NewCreateGroupBiz(groupStore)

		if err := business.Create(c, &data); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 3. Create GroupMember
		member := models.GroupMember{
			GroupID:  data.ID,
			UserID:   objID,
			Role:     "owner", // code string
			Status:   "active",
			JoinedAt: time.Now(),
		}

		if err := groupStore.CreateGroupNumber(c, &member); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Group created successfully but could not add creator to group_members: " + err.Error()})
			return
		}

		// 4. Sync to group_user_roles for permission handling
		gurStore := gurStorage.NewMongoStore(db)
		groupUserRole := gurModels.GroupUserRole{
			GroupID: data.ID.Hex(),
			UserID:  objID.Hex(),
			RoleID:  role.ID.Hex(),
		}

		if err := gurStore.Upsert(c, &groupUserRole); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not assign owner role to creator in group_user_roles: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Group created successfully", data))
	}
}
