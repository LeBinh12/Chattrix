package storage

import (
	"context"
	"fmt"
	"log"
	"my-app/modules/chat/models"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type temp struct {
	ID          primitive.ObjectID     `bson:"_id"`
	DisplayName string                 `bson:"display_name"`
	Avatar      string                 `bson:"avatar"`
	LastMessage *models.MessagePreview `bson:"last_message,omitempty"`
	UnreadCount *int                   `bson:"unread_count,omitempty"`
	Status      string                 `bson:"status,omitempty"`
	UpdatedAt   *time.Time             `bson:"updated_at,omitempty"`
}

type groupInfo struct {
	Name  string `bson:"name"`
	Image string `bson:"image"`
}

type groupTemp struct {
	GroupID     primitive.ObjectID     `bson:"group_id"`
	GroupInfo   groupInfo              `bson:"group_info"`
	LastMessage *models.MessagePreview `bson:"last_message,omitempty"`
}

// Xử lý lấy hết tất cả, không quan tâm có tin nhắn không
func (s *MongoChatStore) GetConversations(ctx context.Context, userID string, page, limit int, keyword string) ([]models.ConversationPreview, int64, error) {
	userObjectID := convertToObjectID(userID)

	// Bỏ phân trang ở đây, lấy hết để merge
	userResults, _, err := s.getUserConversations(ctx, userObjectID, 1, 1000, keyword)
	if err != nil {
		return nil, 0, err
	}

	groupResults, err := s.getGroupConversations(ctx, userObjectID, 1, 1000, keyword)
	if err != nil {
		fmt.Println("Lỗi khi lấy group:", err)
	}

	results := make([]models.ConversationPreview, 0)

	// Gộp user conversations
	for _, u := range userResults {
		preview := models.ConversationPreview{
			UserID:      u.ID.Hex(),
			DisplayName: u.DisplayName,
			Avatar:      u.Avatar,
			Type:        "user",
		}
		if u.LastMessage != nil {
			preview.LastMessage = u.LastMessage.Content
			preview.LastMessageType = u.LastMessage.Type
			preview.SenderID = u.LastMessage.SenderID.Hex()
			preview.RecalledAt = u.LastMessage.RecalledAt
			preview.RecalledBy = u.LastMessage.RecalledBy

			if !u.LastMessage.CreatedAt.IsZero() {
				preview.LastDate = u.LastMessage.CreatedAt
			}
			preview.LastMessageID = u.LastMessage.ID.Hex()

		}
		if u.UnreadCount != nil {
			preview.UnreadCount = *u.UnreadCount
		}
		if u.Status != "" {
			preview.Status = u.Status
		}
		if u.UpdatedAt != nil {
			preview.UpdatedAt = *u.UpdatedAt
		}
		results = append(results, preview)
	}

	// Gộp group conversations
	for _, g := range groupResults {
		preview := models.ConversationPreview{
			GroupID:     g.GroupID.Hex(),
			DisplayName: g.GroupInfo.Name,
			Avatar:      g.GroupInfo.Image,
			Type:        "group",
		}
		if g.LastMessage != nil {
			preview.LastMessage = g.LastMessage.Content
			preview.LastMessageType = g.LastMessage.Type
			preview.RecalledBy = g.LastMessage.RecalledBy

			if !g.LastMessage.CreatedAt.IsZero() {
				preview.LastDate = g.LastMessage.CreatedAt
			}
			preview.LastMessageID = g.LastMessage.ID.Hex()
			preview.RecalledAt = g.LastMessage.RecalledAt

		}
		results = append(results, preview)
	}

	// 🔹 SẮP XẾP THEO THỜI GIAN TIN NHẮN CUỐI
	sort.Slice(results, func(i, j int) bool {
		// Nếu không có LastDate, đẩy xuống cuối
		if results[i].LastDate.IsZero() {
			return false
		}
		if results[j].LastDate.IsZero() {
			return true
		}
		return results[i].LastDate.After(results[j].LastDate)
	})

	// 🔹 PHÂN TRANG SAU KHI SẮP XẾP
	start := (page - 1) * limit
	end := start + limit

	if start > len(results) {
		return []models.ConversationPreview{}, int64(len(results)), nil
	}
	if end > len(results) {
		end = len(results)
	}

	return results[start:end], int64(len(results)), nil
}

func convertToObjectID(id string) primitive.ObjectID {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		log.Println("Invalid ObjectID:", err)
	}
	return objID
}
