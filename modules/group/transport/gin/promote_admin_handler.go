package ginGroup

import (
	"fmt"
	"my-app/common"
	modelsChat "my-app/modules/chat/models"
	storageChat "my-app/modules/chat/storage"
	"my-app/modules/chat/transport/websocket"
	"my-app/modules/group/biz"
	"my-app/modules/group/storage"
	gurStorage "my-app/modules/group_user_role/storage"
	roleStorage "my-app/modules/role/storage"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func PromoteToAdminHandler(db *mongo.Database, hub *websocket.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		groupID := c.Query("group_id")
		userID := c.Query("user_id")

		if groupID == "" || userID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing group_id or user_id"})
			return
		}

		requesterID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "identification information not found"})
			return
		}

		requesterIDStr, ok := requesterID.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid identification"})
			return
		}

		// 1. Find admin role information
		roleStore := roleStorage.NewMongoStore(db)
		adminRole, err := roleStore.FindByCode(c.Request.Context(), "admin")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Admin role lookup failed: " + err.Error()})
			return
		}

		// 2. Perform business logic to update group_members
		groupStore := storage.NewMongoStoreGroup(db)
		business := biz.NewPromoteAdminBiz(groupStore)

		if err := business.PromoteMember(c.Request.Context(), requesterIDStr, groupID, userID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// 3. Update group_user_roles (Formal RBAC)
		gurStore := gurStorage.NewMongoStore(db)
		if err := gurStore.UpdateRole(c.Request.Context(), groupID, userID, adminRole.ID.Hex()); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not update admin role: " + err.Error()})
			return
		}

		// 4. Create system message and broadcast socket notification
		requesterOID, _ := primitive.ObjectIDFromHex(requesterIDStr)
		chatStore := storageChat.NewMongoChatStore(db)
		requesterUser, _ := chatStore.GetUserById(c.Request.Context(), requesterOID)
		ownerName := requesterIDStr
		if requesterUser != nil {
			ownerName = requesterUser.DisplayName
		}

		targetOID, _ := primitive.ObjectIDFromHex(userID)
		targetUser, _ := chatStore.GetUserById(c.Request.Context(), targetOID)
		targetUserName := userID
		if targetUser != nil {
			targetUserName = targetUser.DisplayName
		}

		content := fmt.Sprintf("%s bổ nhiệm %s làm Quản trị viên nhóm mới", ownerName, targetUserName)
		groupOID, _ := primitive.ObjectIDFromHex(groupID)

		msg := &modelsChat.Message{
			ID:        primitive.NewObjectID(),
			SenderID:  requesterOID,
			GroupID:   groupOID,
			Content:   content,
			Type:      "system",
			CreatedAt: time.Now(),
			Status:    modelsChat.StatusSent,
		}

		if err := chatStore.SaveMessage(c.Request.Context(), msg); err == nil {
			msgResponse := &modelsChat.MessageResponse{
				ID:         msg.ID,
				SenderID:   msg.SenderID,
				GroupID:    msg.GroupID,
				Content:    msg.Content,
				Type:       msg.Type,
				CreatedAt:  msg.CreatedAt,
				Status:     msg.Status,
				SenderName: ownerName,
			}

			hub.Broadcast <- websocket.HubEvent{
				Type:    "chat",
				Payload: msgResponse,
			}
		}

		// Send socket event to notify recipient to refresh permissions
		hub.Broadcast <- websocket.HubEvent{
			Type: "group_member_promoted",
			Payload: map[string]interface{}{
				"group_id": groupID,
				"user_id":  userID,
				"role":     "admin",
			},
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Admin appointed successfully", true))
	}
}
