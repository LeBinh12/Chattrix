package ginGroup

import (
	"my-app/common"
	"my-app/modules/group/biz"
	"my-app/modules/group/models"
	"my-app/modules/group/storage"

	bizUser "my-app/modules/user/biz"
	modelsUser "my-app/modules/user/models"
	storageUser "my-app/modules/user/storage"

	"my-app/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

func CreateGroupMemberHandler(db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body models.GroupMember

		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, utils.HandleValidationErrors(err))
			return
		}

		body.Role = "member" // Normalize to 'number' for new members

		body.Status = "active"

		// 1. Add to group_members (logic to create member/number record)
		groupStore := storage.NewMongoStoreGroup(db)
		business := biz.NewCreateGroupMemberBiz(groupStore)

		if err := business.CreateGroupNumber(c, &body); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 2. Upsert settings for the user in this group
		storeUser := storageUser.NewMongoStore(db)
		businessUser := bizUser.NewUpdateSettingBiz(storeUser)

		bodySetting := modelsUser.UserChatSettingRequest{
			UserID:   body.UserID,
			TargetID: body.GroupID,
			IsGroup:  true,
			IsMuted:  false,
		}

		if err := businessUser.UpsertSetting(c, &bodySetting); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 3. Sync to group_user_roles (Formal RBAC) using refactored UpdateMemberRole
		if err := groupStore.UpdateMemberRole(c, body.GroupID, body.UserID, body.Role); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not assign role to member: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Member added successfully", body))
	}
}
