package biz

import (
	"context"
	"fmt"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CreateTaskBiz struct {
	taskStorage    *storage.TaskStorage
	messageStorage *storage.MongoChatStore
	socket         interface {
		SendMessage(msg interface{})
	} // Simple interface for socket, or we use the existing mechanism
}

func NewCreateTaskBiz(taskStorage *storage.TaskStorage, messageStorage *storage.MongoChatStore) *CreateTaskBiz {
	return &CreateTaskBiz{taskStorage: taskStorage, messageStorage: messageStorage}
}

// NOTE: We might need to inject the real Socket manager or reuse the existing logic.
// For now, I'll rely on the existing CreateMessage flow, but here I orchestrate both Task and Message creation.

func (biz *CreateTaskBiz) CreateTask(ctx context.Context, req *models.CreateTaskRequest, creatorID string) (*models.Task, *models.Message, error) {
	creatorObjID, _ := primitive.ObjectIDFromHex(creatorID)
	assigneeObjID, _ := primitive.ObjectIDFromHex(req.AssigneeID)
	var groupObjID primitive.ObjectID
	if req.GroupID != "" && req.GroupID != "000000000000000000000000" {
		groupObjID, _ = primitive.ObjectIDFromHex(req.GroupID)
	} else {
		groupObjID = primitive.NilObjectID
	}

	// Convert attachment IDs from Hex String to primitive.ObjectID
	var attachmentObjIDs []primitive.ObjectID
	if len(req.AttachmentIDs) > 0 {
		for _, id := range req.AttachmentIDs {
			if objID, err := primitive.ObjectIDFromHex(id); err == nil {
				attachmentObjIDs = append(attachmentObjIDs, objID)
			}
		}
	}

	// 1. Create Task
	task := &models.Task{
		Title:         req.Title,
		Description:   req.Description,
		AssigneeID:    assigneeObjID,
		AssigneeName:  req.AssigneeName,
		CreatorID:     creatorObjID,
		CreatorName:   req.CreatorName,
		GroupID:       groupObjID,
		Deadline:      req.Deadline,
		Priority:      req.Priority,
		StartTime:     req.StartTime,
		EndTime:       req.EndTime,
		AttachmentIDs: attachmentObjIDs,
		Status:        models.TaskStatusPendingAcceptance,
	}
	task.ID = primitive.NewObjectID()

	if err := biz.taskStorage.CreateTask(ctx, task); err != nil {
		return nil, nil, err
	}

	// 1.1 Hydrate attachments for the returned object
	if len(attachmentObjIDs) > 0 {
		if medias, err := biz.messageStorage.GetMediasByIDs(ctx, attachmentObjIDs); err == nil {
			task.Attachments = medias
		}
	}

	// 2. Create Message referencing Task
	msg := &models.Message{
		SenderID:   creatorObjID,
		GroupID:    groupObjID,
		ReceiverID: assigneeObjID,
		Content:    req.Title, // Fallback content
		Type:       models.MediaTypeTask,
		CreatedAt:  time.Now(),
		Status:     models.StatusSent,
		IsRead:     false,
		Task:       task, // Embed full task or just ID? Embedding full task is better for display
	}

	// if err := biz.messageStorage.SaveMessage(ctx, msg); err != nil {
	// 	return nil, nil, err
	// }

	return task, msg, nil
}

// CreateTasksBulk tạo nhiều task cùng lúc (atomic: tất cả thành công hoặc rollback hoàn toàn).
// Hỗ trợ cả single (backward-compat) và multi-assign.
func (biz *CreateTaskBiz) CreateTasksBulk(ctx context.Context, req *models.CreateTaskRequest, creatorID string) ([]*models.Task, error) {
	// --- Chuẩn hoá danh sách người nhận ---
	assignees := req.Assignees
	if len(assignees) == 0 {
		if req.AssigneeID == "" {
			return nil, fmt.Errorf("phải có ít nhất một người được giao")
		}
		assignees = []models.AssigneeInfo{
			{AssigneeID: req.AssigneeID, AssigneeName: req.AssigneeName},
		}
	}

	for i, a := range assignees {
		if a.AssigneeID == "" {
			return nil, fmt.Errorf("người nhận thứ %d thiếu assignee_id", i+1)
		}
	}

	// --- Xử lý common fields ---
	creatorObjID, err := primitive.ObjectIDFromHex(creatorID)
	if err != nil {
		return nil, fmt.Errorf("creator_id không hợp lệ")
	}

	var groupObjID primitive.ObjectID
	if req.GroupID != "" && req.GroupID != "000000000000000000000000" {
		groupObjID, _ = primitive.ObjectIDFromHex(req.GroupID)
	}

	var attachmentObjIDs []primitive.ObjectID
	for _, id := range req.AttachmentIDs {
		if objID, e := primitive.ObjectIDFromHex(id); e == nil {
			attachmentObjIDs = append(attachmentObjIDs, objID)
		}
	}

	// --- Xây dựng danh sách task ---
	// assign_type = "group"  + nhiều người → 1 task chung với Assignees[]
	// assign_type = "personal" hoặc chỉ 1 người → N task độc lập
	isGroupAssign := req.AssignType == "group" && len(assignees) > 1
	if isGroupAssign {
		// --- GROUP TASK: 1 document, nhiều assignee ---
		assigneeStatuses := make([]models.AssigneeStatus, 0, len(assignees))
		for _, a := range assignees {
			aObjID, _ := primitive.ObjectIDFromHex(a.AssigneeID)
			assigneeStatuses = append(assigneeStatuses, models.AssigneeStatus{
				AssigneeID:   aObjID,
				AssigneeName: a.AssigneeName,
				Status:       models.TaskStatusPendingAcceptance,
			})
		}

		// Dùng người đầu tiên để backfill top-level fields (backward compat)
		firstObjID, _ := primitive.ObjectIDFromHex(assignees[0].AssigneeID)
		groupTask := &models.Task{
			Title:         req.Title,
			Description:   req.Description,
			AssigneeID:    firstObjID,
			AssigneeName:  assignees[0].AssigneeName,
			Assignees:     assigneeStatuses,
			CreatorID:     creatorObjID,
			CreatorName:   req.CreatorName,
			GroupID:       groupObjID,
			Deadline:      req.Deadline,
			Priority:      req.Priority,
			StartTime:     req.StartTime,
			EndTime:       req.EndTime,
			AttachmentIDs: attachmentObjIDs,
			Status:        models.TaskStatusPendingAcceptance,
		}

		if err := biz.taskStorage.CreateTask(ctx, groupTask); err != nil {
			return nil, fmt.Errorf("tạo công việc nhóm thất bại: %w", err)
		}

		// Hydrate attachments
		if len(attachmentObjIDs) > 0 {
			if medias, e := biz.messageStorage.GetMediasByIDs(ctx, attachmentObjIDs); e == nil {
				groupTask.Attachments = medias
			}
		}

		return []*models.Task{groupTask}, nil
	}

	// --- SINGLE-ASSIGNEE TASK: giữ nguyên design cũ ---
	tasks := make([]*models.Task, 0, len(assignees))
	for _, a := range assignees {
		assigneeObjID, _ := primitive.ObjectIDFromHex(a.AssigneeID)
		tasks = append(tasks, &models.Task{
			Title:         req.Title,
			Description:   req.Description,
			AssigneeID:    assigneeObjID,
			AssigneeName:  a.AssigneeName,
			CreatorID:     creatorObjID,
			CreatorName:   req.CreatorName,
			GroupID:       groupObjID,
			Deadline:      req.Deadline,
			Priority:      req.Priority,
			StartTime:     req.StartTime,
			EndTime:       req.EndTime,
			AttachmentIDs: attachmentObjIDs,
			Status:        models.TaskStatusPendingAcceptance,
		})
	}

	// --- Atomic bulk insert (InsertMany: all-or-nothing) ---
	if err := biz.taskStorage.BulkCreateTasks(ctx, tasks); err != nil {
		return nil, fmt.Errorf("tạo công việc thất bại, vui lòng thử lại: %w", err)
	}

	// --- Hydrate attachments ---
	if len(attachmentObjIDs) > 0 {
		if medias, e := biz.messageStorage.GetMediasByIDs(ctx, attachmentObjIDs); e == nil {
			for _, t := range tasks {
				t.Attachments = medias
			}
		}
	}

	return tasks, nil
}
