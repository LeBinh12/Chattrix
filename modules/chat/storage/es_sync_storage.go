package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"
)

func (s *ESChatStore) RecallMessage(ctx context.Context, messageID string) error {
	now := time.Now()
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"term": map[string]interface{}{
				"id.keyword": messageID,
			},
		},
		"script": map[string]interface{}{
			"source": "ctx._source.recalled_at = params.recalled_at; ctx._source.content = ''; ctx._source.content_raw = ''",
			"params": map[string]interface{}{
				"recalled_at": now,
			},
		},
	}

	body, err := json.Marshal(query)
	if err != nil {
		return err
	}

	res, err := s.client.UpdateByQuery(
		[]string{"messages"},
		s.client.UpdateByQuery.WithContext(ctx),
		s.client.UpdateByQuery.WithBody(bytes.NewReader(body)),
		s.client.UpdateByQuery.WithRefresh(true),
	)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		log.Printf("[ES] Recall error: %s", res.Status())
		return fmt.Errorf("es recall error: %s", res.Status())
	}

	return nil
}

func (s *ESChatStore) DeleteMessageForMe(ctx context.Context, userID string, messageIDs []string) error {
	// Sử dụng UpdateByQuery để thêm userID vào mảng deleted_for
	query := map[string]interface{}{
		"query": map[string]interface{}{
			"terms": map[string]interface{}{
				"id.keyword": messageIDs,
			},
		},
		"script": map[string]interface{}{
			"source": "if (ctx._source.deleted_for == null) { ctx._source.deleted_for = [params.user_id] } else if (!ctx._source.deleted_for.contains(params.user_id)) { ctx._source.deleted_for.add(params.user_id) }",
			"params": map[string]interface{}{
				"user_id": userID,
			},
		},
	}

	body, err := json.Marshal(query)
	if err != nil {
		return err
	}

	res, err := s.client.UpdateByQuery(
		[]string{"messages"},
		s.client.UpdateByQuery.WithContext(ctx),
		s.client.UpdateByQuery.WithBody(bytes.NewReader(body)),
		s.client.UpdateByQuery.WithRefresh(true),
	)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		log.Printf("[ES] DeleteForMe error: %s", res.Status())
		return fmt.Errorf("es delete for me error: %s", res.Status())
	}

	return nil
}
