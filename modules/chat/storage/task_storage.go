package storage

import (
	"context"
	"my-app/modules/chat/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type TaskStorage struct {
	db *mongo.Database
}

func NewTaskStorage(db *mongo.Database) *TaskStorage {
	return &TaskStorage{db: db}
}

func (s *TaskStorage) CreateTask(ctx context.Context, task *models.Task) error {
	task.ID = primitive.NewObjectID()
	task.CreatedAt = time.Now()
	task.UpdatedAt = time.Now()

	_, err := s.db.Collection("tasks").InsertOne(ctx, task)
	return err
}

func (s *TaskStorage) BulkCreateTasks(ctx context.Context, tasks []*models.Task) error {
	if len(tasks) == 0 {
		return nil
	}

	now := time.Now()
	docs := make([]interface{}, len(tasks))
	for i, t := range tasks {
		t.ID = primitive.NewObjectID()
		t.CreatedAt = now
		t.UpdatedAt = now
		docs[i] = t
	}

	_, err := s.db.Collection("tasks").InsertMany(ctx, docs)
	return err
}

func (s *TaskStorage) GetTask(ctx context.Context, taskID primitive.ObjectID) (*models.Task, error) {
	var tasks []models.Task

	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: bson.M{"_id": taskID}}},
		// Lookup attachments
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "medias",
			"localField":   "attachment_ids",
			"foreignField": "_id",
			"as":           "attachments",
		}}},
	}

	cursor, err := s.db.Collection("tasks").Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	if err = cursor.All(ctx, &tasks); err != nil {
		return nil, err
	}

	if len(tasks) == 0 {
		return nil, mongo.ErrNoDocuments
	}

	return &tasks[0], nil
}

func (s *TaskStorage) UpdateTaskStatus(ctx context.Context, taskID primitive.ObjectID, status models.TaskStatus) error {
	filter := bson.M{"_id": taskID}
	update := bson.M{
		"$set": bson.M{
			"status":     status,
			"updated_at": time.Now(),
		},
	}
	_, err := s.db.Collection("tasks").UpdateOne(ctx, filter, update)
	return err
}

// UpdateTaskAssigneeStatus cập nhật trạng thái riêng của một người trong group task (Assignees[]).
func (s *TaskStorage) UpdateTaskAssigneeStatus(
	ctx context.Context,
	taskID primitive.ObjectID,
	assigneeID primitive.ObjectID,
	status models.TaskStatus,
	rejectReason string,
) error {
	now := time.Now()

	setFields := bson.M{
		"assignees.$[elem].status":     status,
		"assignees.$[elem].updated_at": now,
		"updated_at":                   now,
	}

	switch status {
	case models.TaskStatusAccepted:
		setFields["assignees.$[elem].accepted_at"] = now
		setFields["assignees.$[elem].rejected_at"] = nil
		setFields["assignees.$[elem].reject_reason"] = ""
	case models.TaskStatusRejected:
		setFields["assignees.$[elem].rejected_at"] = now
		setFields["assignees.$[elem].accepted_at"] = nil
		if rejectReason != "" {
			setFields["assignees.$[elem].reject_reason"] = rejectReason
		} else {
			setFields["assignees.$[elem].reject_reason"] = ""
		}
	default:
		setFields["assignees.$[elem].accepted_at"] = nil
		setFields["assignees.$[elem].rejected_at"] = nil
		setFields["assignees.$[elem].reject_reason"] = ""
	}

	filter := bson.M{"_id": taskID}
	update := bson.M{"$set": setFields}
	arrayFilters := options.ArrayFilters{
		Filters: []interface{}{
			bson.M{"elem.assignee_id": assigneeID},
		},
	}
	opts := options.UpdateOptions{ArrayFilters: &arrayFilters}

	_, err := s.db.Collection("tasks").UpdateOne(ctx, filter, update, &opts)
	return err
}

// UpdateEmbeddedTaskAssigneeStatus đồng bộ trạng thái assignee trong embedded task bên trong messages.
func (s *TaskStorage) UpdateEmbeddedTaskAssigneeStatus(
	ctx context.Context,
	taskID primitive.ObjectID,
	assigneeID primitive.ObjectID,
	status models.TaskStatus,
	rejectReason string,
) error {
	now := time.Now()

	setFields := bson.M{
		"task.assignees.$[elem].status":     status,
		"task.assignees.$[elem].updated_at": now,
		"task.updated_at":                   now,
	}

	switch status {
	case models.TaskStatusAccepted:
		setFields["task.assignees.$[elem].accepted_at"] = now
		setFields["task.assignees.$[elem].rejected_at"] = nil
		setFields["task.assignees.$[elem].reject_reason"] = ""
	case models.TaskStatusRejected:
		setFields["task.assignees.$[elem].rejected_at"] = now
		setFields["task.assignees.$[elem].accepted_at"] = nil
		if rejectReason != "" {
			setFields["task.assignees.$[elem].reject_reason"] = rejectReason
		} else {
			setFields["task.assignees.$[elem].reject_reason"] = ""
		}
	default:
		setFields["task.assignees.$[elem].accepted_at"] = nil
		setFields["task.assignees.$[elem].rejected_at"] = nil
		setFields["task.assignees.$[elem].reject_reason"] = ""
	}

	filter := bson.M{
		"type":     "task",
		"task._id": taskID,
	}
	update := bson.M{"$set": setFields}
	arrayFilters := options.ArrayFilters{
		Filters: []interface{}{
			bson.M{"elem.assignee_id": assigneeID},
		},
	}
	opts := options.UpdateOptions{ArrayFilters: &arrayFilters}

	// UpdateMany vì cùng 1 task có thể được gửi nhiều lần
	_, err := s.db.Collection("messages").UpdateMany(ctx, filter, update, &opts)
	return err
}

func (s *TaskStorage) ListTasks(ctx context.Context, filter bson.M) ([]models.Task, error) {
	var tasks []models.Task

	pipeline := mongo.Pipeline{
		bson.D{{Key: "$match", Value: filter}},
		// Lookup attachments
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "medias",
			"localField":   "attachment_ids",
			"foreignField": "_id",
			"as":           "attachments",
		}}},
		// Sort by updated_at desc
		bson.D{{Key: "$sort", Value: bson.M{"updated_at": -1}}},
	}

	cursor, err := s.db.Collection("tasks").Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	if err = cursor.All(ctx, &tasks); err != nil {
		return nil, err
	}
	return tasks, nil
}

func (s *TaskStorage) UpdateEmbeddedTaskStatus(
	ctx context.Context,
	taskID primitive.ObjectID,
	newStatus models.TaskStatus,
	rejectReason string,
) error {
	now := time.Now()

	// Các field luôn cập nhật
	updateFields := bson.M{
		"task.status":     newStatus,
		"task.updated_at": now,
	}

	// Xử lý các field phụ theo trạng thái mới
	switch newStatus {
	case models.TaskStatusAccepted:
		updateFields["task.accepted_at"] = now
		// Reset các field từ chối nếu có
		updateFields["task.rejected_at"] = nil
		updateFields["task.reject_reason"] = ""

	case models.TaskStatusRejected:
		updateFields["task.rejected_at"] = now
		if rejectReason != "" {
			updateFields["task.reject_reason"] = rejectReason
		} else {
			updateFields["task.reject_reason"] = ""
		}
		// Reset accepted_at
		updateFields["task.accepted_at"] = nil

	case models.TaskStatusTodo, models.TaskStatusInProgress, models.TaskStatusDone, models.TaskStatusCancel:
		// Reset các trường chấp nhận/từ chối khi chuyển sang trạng thái làm việc
		updateFields["task.accepted_at"] = nil
		updateFields["task.rejected_at"] = nil
		updateFields["task.reject_reason"] = ""

	case models.TaskStatusPendingAcceptance:
		// Reset về trạng thái chờ
		updateFields["task.accepted_at"] = nil
		updateFields["task.rejected_at"] = nil
		updateFields["task.reject_reason"] = ""
	}

	// Filter: tìm tất cả message có type="task" và task._id khớp
	filter := bson.M{
		"type":     "task",
		"task._id": taskID,
	}

	update := bson.M{
		"$set": updateFields,
	}

	result, err := s.db.Collection("messages").UpdateMany(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments // Không tìm thấy task nào với ID này
	}

	// Optional: log số lượng document được cập nhật
	// log.Printf("Updated task status for %d messages", result.ModifiedCount)

	return nil
}
