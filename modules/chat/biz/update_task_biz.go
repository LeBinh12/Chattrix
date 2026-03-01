package biz

import (
	"context"
	"fmt"
	"my-app/modules/chat/models"
	"my-app/modules/chat/storage"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UpdateTaskBiz struct {
	taskStorage        *storage.TaskStorage
	taskCommentStorage *storage.TaskCommentStorage
	chatStorage        *storage.MongoChatStore
}

func NewUpdateTaskBiz(
	taskStorage *storage.TaskStorage,
	taskCommentStorage *storage.TaskCommentStorage,
	chatStorage *storage.MongoChatStore,
) *UpdateTaskBiz {
	return &UpdateTaskBiz{
		taskStorage:        taskStorage,
		taskCommentStorage: taskCommentStorage,
		chatStorage:        chatStorage,
	}
}

func (biz *UpdateTaskBiz) UpdateTaskStatus(ctx context.Context, taskID string, updaterID string, req *models.UpdateTaskStatusRequest) (*models.TaskComment, error) {
	taskObjID, err := primitive.ObjectIDFromHex(taskID)
	if err != nil {
		return nil, err
	}

	updaterObjID, err := primitive.ObjectIDFromHex(updaterID)
	if err != nil {
		return nil, err
	}

	// 1. Get updater info for the comment
	user, err := biz.chatStorage.GetUserById(ctx, updaterObjID)
	if err != nil {
		return nil, err
	}

	// 2. Load task để kiểm tra group task hay single
	task, err := biz.taskStorage.GetTask(ctx, taskObjID)
	if err != nil {
		return nil, fmt.Errorf("không tìm thấy task: %w", err)
	}

	// 3. Perform the updates
	if len(task.Assignees) > 0 {
		// GROUP TASK: chỉ cập nhật trạng thái riêng của assignee này
		targetID := updaterObjID
		if req.AssigneeID != "" {
			if parsed, e := primitive.ObjectIDFromHex(req.AssigneeID); e == nil {
				targetID = parsed
			}
		}

		// Kiểm tra targetID có trong danh sách assignees không
		found := false
		for _, a := range task.Assignees {
			if a.AssigneeID == targetID {
				found = true
				break
			}
		}
		if !found {
			return nil, fmt.Errorf("người dùng không có trong danh sách người nhận của task này")
		}

		if err := biz.taskStorage.UpdateTaskAssigneeStatus(ctx, taskObjID, targetID, req.Status, req.RejectReason); err != nil {
			return nil, err
		}

		_ = biz.taskStorage.UpdateEmbeddedTaskAssigneeStatus(ctx, taskObjID, targetID, req.Status, req.RejectReason)
	} else {
		// SINGLE-ASSIGNEE TASK: logic cũ
		if err := biz.taskStorage.UpdateEmbeddedTaskStatus(ctx, taskObjID, req.Status, req.RejectReason); err != nil {
			return nil, err
		}
		if err := biz.taskStorage.UpdateTaskStatus(ctx, taskObjID, req.Status); err != nil {
			return nil, err
		}
	}

	// 4. Create system comment
	statusLabels := map[models.TaskStatus]string{
		models.TaskStatusPendingAcceptance: "Chờ tiếp nhận",
		models.TaskStatusAccepted:          "Đã tiếp nhận",
		models.TaskStatusTodo:              "Chưa bắt đầu",
		models.TaskStatusInProgress:        "Đang thực hiện",
		models.TaskStatusDone:              "Đã hoàn thành",
		models.TaskStatusRejected:          "Đã từ chối",
		models.TaskStatusCancel:            "Đã hủy",
	}

	content := fmt.Sprintf("đã thay đổi trạng thái thành: %s", statusLabels[req.Status])
	if req.Status == models.TaskStatusRejected && req.RejectReason != "" {
		content = fmt.Sprintf("đã từ chối công việc với lý do: %s", req.RejectReason)
	}

	systemComment := &models.TaskComment{
		ID:         primitive.NewObjectID(),
		TaskID:     taskObjID,
		UserID:     updaterObjID,
		UserName:   user.DisplayName,
		UserAvatar: user.Avatar,
		Content:    content,
		Type:       models.TaskActSystem,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := biz.taskCommentStorage.CreateComment(ctx, systemComment); err != nil {
		return nil, err
	}

	return systemComment, nil
}
