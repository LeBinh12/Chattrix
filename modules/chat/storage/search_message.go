package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"my-app/modules/chat/models"
	"regexp"
	"strconv"
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
	content string,
	myID string,
	otherID string,
	groupID string,
	limit int,
	cursorTime string, // <<< thêm cursor
) ([]models.ESMessage, string, error) {

	if limit <= 0 {
		limit = 20
	}

	// remove HTML
	cleanContent := strings.TrimSpace(stripHTML(content))

	// ================== QUERY MATCH ==================
	mustQueries := []interface{}{
		map[string]interface{}{
			"bool": map[string]interface{}{
				"should": []interface{}{
					map[string]interface{}{
						"wildcard": map[string]interface{}{
							"content_raw": map[string]interface{}{
								"value": "*" + strings.ToLower(cleanContent) + "*",
								"boost": 1.0,
							},
						},
					},
					map[string]interface{}{
						"prefix": map[string]interface{}{
							"content_raw": map[string]interface{}{
								"value": strings.ToLower(cleanContent),
								"boost": 2.0,
							},
						},
					},
					map[string]interface{}{
						"match_phrase_prefix": map[string]interface{}{
							"content_raw": map[string]interface{}{
								"query": cleanContent,
								"boost": 1.5,
							},
						},
					},
					map[string]interface{}{
						"match": map[string]interface{}{
							"content_raw": map[string]interface{}{
								"query":     cleanContent,
								"boost":     3.0,
								"fuzziness": "AUTO",
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

	// ================== FILTER USER OR GROUP ==================
	if groupID != "" {
		boolQuery["filter"] = []interface{}{
			map[string]interface{}{
				"term": map[string]interface{}{
					"group_id.keyword": groupID,
				},
			},
		}
	} else {
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

	// ================== SORT ==================
	sortFields := []interface{}{
		map[string]interface{}{
			"created_at": map[string]interface{}{
				"order": "desc",
			},
		},
	}

	query := map[string]interface{}{
		"size": limit,
		"sort": sortFields,
		"query": map[string]interface{}{
			"bool": boolQuery,
		},
	}

	// ================== search_after ==================
	if cursorTime != "" {
		query["search_after"] = []interface{}{cursorTime}
	}

	body, _ := json.Marshal(query)

	res, err := s.client.Search(
		s.client.Search.WithContext(ctx),
		s.client.Search.WithIndex("messages"),
		s.client.Search.WithBody(bytes.NewReader(body)),
	)
	if err != nil {
		return nil, "", err
	}
	defer res.Body.Close()

	var result struct {
		Hits struct {
			Hits []struct {
				Sort   []interface{}    `json:"sort"`
				Source models.ESMessage `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}

	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil, "", err
	}

	// ================== PARSE RESULT ==================
	messages := make([]models.ESMessage, 0, len(result.Hits.Hits))
	var nextCursor string

	for _, hit := range result.Hits.Hits {
		messages = append(messages, hit.Source)

		if len(hit.Sort) > 0 {
			switch v := hit.Sort[0].(type) {
			case string:
				nextCursor = v
			case float64:
				// Chuyển timestamp số sang string
				nextCursor = strconv.FormatFloat(v, 'f', 0, 64)
			default:
				nextCursor = ""
			}
		}
	}

	return messages, nextCursor, nil
}
