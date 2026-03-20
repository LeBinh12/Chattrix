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

func RemoveGroupMemberHandler(db *mongo.Database, hub *websocket.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		groupID := c.Query("group_id")
		userID := c.Query("user_id")

		if groupID == "" || userID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "thiếu group_id hoặc user_id"})
			return
		}

		requesterID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "không tìm thấy thông tin định danh"})
			return
		}

		requesterIDStr, ok := requesterID.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "định danh không hợp lệ"})
			return
		}

		store := storage.NewMongoStoreGroup(db)
		business := biz.NewRemoveGroupMemberBiz(store)

		successorID, err := business.RemoveMember(c.Request.Context(), requesterIDStr, groupID, userID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// 1. Name of the person performing the removal (group owner) or self
		requesterOID, _ := primitive.ObjectIDFromHex(requesterIDStr)
		chatStore := storageChat.NewMongoChatStore(db)
		requesterUser, err := chatStore.GetUserById(c.Request.Context(), requesterOID)
		ownerName := requesterIDStr // fallback
		if err == nil && requesterUser != nil {
			ownerName = requesterUser.DisplayName
		}

		// 2. Name of the person being removed/leaving
		targetOID, _ := primitive.ObjectIDFromHex(userID)
		targetUser, err := chatStore.GetUserById(c.Request.Context(), targetOID)
		targetUserName := userID // fallback
		if err == nil && targetUser != nil {
			targetUserName = targetUser.DisplayName
		}

		// 3. Handle leave group & succession message
		content := fmt.Sprintf("%s đã Xóa %s rời khỏi nhóm", ownerName, targetUserName)
		if requesterIDStr == userID {
			content = fmt.Sprintf("%s đã rời khỏi nhóm", targetUserName)
		}

		// If there is a successor
		var newOwnerIDStr string
		if successorID != nil {
			newOwnerIDStr = successorID.Hex()
			successorUser, _ := chatStore.GetUserById(c.Request.Context(), *successorID)
			successorDisplayName := newOwnerIDStr
			if successorUser != nil {
				successorDisplayName = successorUser.DisplayName
			}
			content += fmt.Sprintf(". %s đã trở thành Trưởng nhóm mới", successorDisplayName)
		}

		groupOID, _ := primitive.ObjectIDFromHex(groupID)

		msg := &modelsChat.Message{
			ID:           primitive.NewObjectID(),
			SenderID:     requesterOID,
			GroupID:      groupOID,
			Content:      content,
			Type:         "system",
			CreatedAt:    time.Now(),
			Status:       modelsChat.StatusSent,
			SystemAction: "leave",
			NewOwnerID:   newOwnerIDStr,
			OldOwnerID:   userID,
		}

		if newOwnerIDStr != "" {
			msg.SystemAction = "leave_with_succession"
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
				SenderName:   ownerName,
				SystemAction: msg.SystemAction,
				NewOwnerID:   msg.NewOwnerID,
				OldOwnerID:   msg.OldOwnerID,
			}

			hub.Broadcast <- websocket.HubEvent{
				Type:    "chat",
				Payload: msgResponse,
			}
		}

		hub.Broadcast <- websocket.HubEvent{
			Type: "group_member_removed",
			Payload: map[string]interface{}{
				"group_id": groupID,
				"user_id":  userID,
			},
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Xóa thành viên thành công", true))
	}
}
