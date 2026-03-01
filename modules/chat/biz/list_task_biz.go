package biz

import (
	"context"
	"my-app/modules/chat/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ListTaskStorage interface {
	ListTasks(ctx context.Context, filter bson.M) ([]models.Task, error)
}

type listTaskBiz struct {
	store ListTaskStorage
}

func NewListTaskBiz(store ListTaskStorage) *listTaskBiz {
	return &listTaskBiz{store: store}
}

func (biz *listTaskBiz) ListTasks(ctx context.Context, userID string, filterType string) ([]models.Task, error) {
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}

	var filter bson.M
	// Default filter: active tasks? or all?
	// Usually users want to see all tasks related to them (done/todo etc) and filter on frontend,
	// OR we support status filter in backend.
	// For now, let's just filter by relationship (Assignee vs Creator).

	if filterType == "assigned_by_me" {
		filter = bson.M{"creator_id": objID}
	} else {
		// Default "assigned_to_me": khớp cả single-assignee và group task
		filter = bson.M{
			"$or": []bson.M{
				{"assignee_id": objID},
				{"assignees.assignee_id": objID},
			},
		}
	}

	return biz.store.ListTasks(ctx, filter)
}
