package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"my-app/modules/chat/models"
	"regexp"
	"strings"
)

// stripHTML loại bỏ thẻ HTML
func stripHTML(input string) string {
	re := regexp.MustCompile(`<.*?>`)
	return re.ReplaceAllString(input, "")
}

// SearchMessages tìm kiếm tin nhắn theo content, 1-1 hoặc group
func (s *ESChatStore) SearchMessages(
	ctx context.Context,
	content string, // search text
	myID string, // ID của tôi
	otherID string, // ID người kia (chat 1-1)
	groupID string, // group_id nếu là nhóm
	limit int,
) ([]models.ESMessage, error) {

	if limit <= 0 {
		limit = 20
	}

	cleanContent := stripHTML(content)
	cleanContent = strings.TrimSpace(cleanContent)

	// ============== Query với wildcard và prefix ==============
	// Sử dụng multi_match với nhiều loại query khác nhau
	mustQueries := []interface{}{
		map[string]interface{}{
			"bool": map[string]interface{}{
				"should": []interface{}{
					// 1. Wildcard query - tìm từ có chứa keyword ở bất kỳ đâu
					map[string]interface{}{
						"wildcard": map[string]interface{}{
							"content_raw": map[string]interface{}{
								"value": "*" + strings.ToLower(cleanContent) + "*",
								"boost": 1.0,
							},
						},
					},
					// 2. Prefix query - tìm từ bắt đầu bằng keyword
					map[string]interface{}{
						"prefix": map[string]interface{}{
							"content_raw": map[string]interface{}{
								"value": strings.ToLower(cleanContent),
								"boost": 2.0, // Ưu tiên cao hơn
							},
						},
					},
					// 3. Match phrase prefix - tìm cụm từ bắt đầu với keyword
					map[string]interface{}{
						"match_phrase_prefix": map[string]interface{}{
							"content_raw": map[string]interface{}{
								"query": cleanContent,
								"boost": 1.5,
							},
						},
					},
					// 4. Match query - tìm chính xác
					map[string]interface{}{
						"match": map[string]interface{}{
							"content_raw": map[string]interface{}{
								"query":     cleanContent,
								"boost":     3.0,    // Ưu tiên cao nhất
								"fuzziness": "AUTO", // Cho phép sai sót nhỏ
							},
						},
					},
				},
				"minimum_should_match": 1,
			},
		},
	}

	boolQuery := map[string]interface{}{
		"must": mustQueries,
	}

	// ============= Trường hợp GROUP CHAT =============
	if groupID != "" {
		boolQuery["filter"] = []interface{}{
			map[string]interface{}{
				"term": map[string]interface{}{
					"group_id.keyword": groupID,
				},
			},
		}
	} else {
		// ============= TRƯỜNG HỢP CHAT 1-1 =============
		// Lấy tin nhắn 2 chiều:
		// 1: sender = tôi, receiver = họ
		// 2: sender = họ, receiver = tôi
		boolQuery["should"] = []interface{}{
			map[string]interface{}{
				"bool": map[string]interface{}{
					"must": []interface{}{
						map[string]interface{}{
							"term": map[string]interface{}{
								"sender_id.keyword": myID,
							},
						},
						map[string]interface{}{
							"term": map[string]interface{}{
								"receiver_id.keyword": otherID,
							},
						},
					},
				},
			},
			map[string]interface{}{
				"bool": map[string]interface{}{
					"must": []interface{}{
						map[string]interface{}{
							"term": map[string]interface{}{
								"sender_id.keyword": otherID,
							},
						},
						map[string]interface{}{
							"term": map[string]interface{}{
								"receiver_id.keyword": myID,
							},
						},
					},
				},
			},
		}
		boolQuery["minimum_should_match"] = 1
	}

	// ============== Assemble final query ==============
	query := map[string]interface{}{
		"size": limit,
		"sort": []interface{}{
			map[string]interface{}{
				"_score": map[string]interface{}{ // Sắp xếp theo độ liên quan trước
					"order": "desc",
				},
			},
			map[string]interface{}{
				"created_at": map[string]interface{}{
					"order": "desc",
				},
			},
		},
		"query": map[string]interface{}{
			"bool": boolQuery,
		},
	}

	body, _ := json.Marshal(query)

	// ES search
	res, err := s.client.Search(
		s.client.Search.WithContext(ctx),
		s.client.Search.WithIndex("messages"),
		s.client.Search.WithBody(bytes.NewReader(body)),
	)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	// Parse response
	var result struct {
		Hits struct {
			Hits []struct {
				Source models.ESMessage `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}

	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil, err
	}

	// Convert to array
	messages := make([]models.ESMessage, 0, len(result.Hits.Hits))
	for _, hit := range result.Hits.Hits {
		messages = append(messages, hit.Source)
	}

	return messages, nil
}
