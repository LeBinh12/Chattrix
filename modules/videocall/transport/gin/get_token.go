package gin

import (
	"context"
	"net/http"
	"time"

	"my-app/config"
	"my-app/modules/chat/transport/websocket"
	"my-app/modules/user/storage"

	"github.com/gin-gonic/gin"
	"github.com/livekit/protocol/auth"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetCallTokenHandler(cfg config.LiveKitConfig, hub *websocket.Hub, db *mongo.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		store := storage.NewMongoStore(db)
		currentUser, err := store.FindByID(context.Background(), userIDStr.(string))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		var req struct {
			RoomName        string `json:"roomName" binding:"required"`
			ParticipantName string `json:"participantName" binding:"required"`
			GroupID         string `json:"groupId"`
			ReceiverID      string `json:"receiverId"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		at := auth.NewAccessToken(cfg.APIKey, cfg.APISecret)
		grant := &auth.VideoGrant{
			RoomJoin:       true,
			Room:           req.RoomName,
			CanPublish:     boolPtr(true),
			CanSubscribe:   boolPtr(true),
			CanPublishData: boolPtr(true),
		}
		at.AddGrant(grant).
			SetIdentity(currentUser.ID.Hex()).
			SetName(req.ParticipantName).
			SetValidFor(time.Hour)

		token, err := at.ToJWT()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		// Broadcast call started event
		hub.Broadcast <- websocket.HubEvent{
			Type: "video-call",
			Payload: map[string]interface{}{
				"status":        "started",
				"room_name":     req.RoomName,
				"group_id":      req.GroupID,
				"receiver_id":   req.ReceiverID,
				"caller_id":     currentUser.ID.Hex(),
				"caller_name":   currentUser.DisplayName,
				"caller_avatar": currentUser.Avatar,
			},
		}

		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"url":   cfg.URL,
		})
	}
}

func boolPtr(b bool) *bool {
	return &b
}
