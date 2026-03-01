package ginGroup

import (
	"fmt"
	"my-app/common"
	modelsChat "my-app/modules/chat/models"
	storageChat "my-app/modules/chat/storage"
	"my-app/modules/chat/transport/websocket"
	"my-app/modules/group/biz"
	"my-app/modules/group/storage"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func TransferOwnerHandler(db *mongo.Database, hub *websocket.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		groupID := c.Query("group_id")
		userID := c.Query("user_id") // Recipient's User ID

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

		// 1. Perform business logic to update Group Creator information
		groupStore := storage.NewMongoStoreGroup(db)
		business := biz.NewTransferOwnerBiz(groupStore)

		if err := business.TransferOwnership(c.Request.Context(), requesterIDStr, groupID, userID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// 2. Update group_user_roles and group_members tables via UpdateMemberRole (Formal RBAC)
		gOID, _ := primitive.ObjectIDFromHex(groupID)
		reqOID, _ := primitive.ObjectIDFromHex(requesterIDStr)
		targetOID, _ := primitive.ObjectIDFromHex(userID)

		// Demote the old owner to "number" (regular member)
		if err := groupStore.UpdateMemberRole(c.Request.Context(), gOID, reqOID, "member"); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi khi cập nhật quyền người cũ: " + err.Error()})
			return
		}

		// Promote the new person to "owner"
		if err := groupStore.UpdateMemberRole(c.Request.Context(), gOID, targetOID, "owner"); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi khi cập nhật quyền người mới: " + err.Error()})
			return
		}

		// 3. Create system message and broadcast realtime notification
		chatStore := storageChat.NewMongoChatStore(db)
		requesterUser, _ := chatStore.GetUserById(c.Request.Context(), reqOID)
		oldOwnerName := requesterIDStr
		if requesterUser != nil {
			oldOwnerName = requesterUser.DisplayName
		}

		targetUser, _ := chatStore.GetUserById(c.Request.Context(), targetOID)
		newOwnerName := userID
		if targetUser != nil {
			newOwnerName = targetUser.DisplayName
		}

		content := fmt.Sprintf("%s đã nhường quyền Trưởng nhóm cho %s", oldOwnerName, newOwnerName)

		msg := &modelsChat.Message{
			ID:           primitive.NewObjectID(),
			SenderID:     reqOID,
			GroupID:      gOID,
			Content:      content,
			Type:         "system",
			CreatedAt:    time.Now(),
			Status:       modelsChat.StatusSent,
			SystemAction: "ownership_transferred",
			NewOwnerID:   userID,
			OldOwnerID:   requesterIDStr,
		}

		if err := chatStore.SaveMessage(c.Request.Context(), msg); err == nil {
			// Broadcast realtime
			msgResponse := &modelsChat.MessageResponse{
				ID:           msg.ID,
				SenderID:     msg.SenderID,
				GroupID:      msg.GroupID,
				Content:      msg.Content,
				Type:         msg.Type,
				CreatedAt:    msg.CreatedAt,
				Status:       msg.Status,
				SenderName:   oldOwnerName,
				SystemAction: msg.SystemAction,
				NewOwnerID:   msg.NewOwnerID,
				OldOwnerID:   msg.OldOwnerID,
			}

			hub.Broadcast <- websocket.HubEvent{
				Type:    "chat",
				Payload: msgResponse,
			}
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Group ownership transferred successfully", true))
	}
}
