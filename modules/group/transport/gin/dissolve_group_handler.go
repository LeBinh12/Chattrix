package ginGroup

import (
	"my-app/common"
	storageChat "my-app/modules/chat/storage"
	"my-app/modules/chat/transport/websocket"
	"my-app/modules/group/biz"
	storageGroup "my-app/modules/group/storage"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func DissolveGroupHandler(db *mongo.Database, hub *websocket.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		groupID := c.Query("group_id")
		if groupID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "thiếu group_id"})
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

		store := storageGroup.NewMongoStoreGroup(db)
		business := biz.NewDissolveGroupBiz(store)

		// Pre-fetch members before they are deleted from DB
		chatStore := storageChat.NewMongoChatStore(db)
		gID, _ := primitive.ObjectIDFromHex(groupID)
		members, _ := chatStore.GetGroupMembers(c.Request.Context(), gID)

		groupName, err := business.DissolveGroup(c.Request.Context(), requesterIDStr, groupID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Broadcast realtime event
		hub.Broadcast <- websocket.HubEvent{
			Type: "group_dissolved",
			Payload: map[string]interface{}{
				"group_id":   groupID,
				"group_name": groupName,
				"member_ids": members,
			},
		}

		c.JSON(http.StatusOK, common.NewResponse(http.StatusOK, "Giải tán nhóm thành công", true))
	}
}
