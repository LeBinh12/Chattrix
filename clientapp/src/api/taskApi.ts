import axiosClient from "../utils/axiosClient";
import type { TaskData } from "../components/home/chat_window/AssignTaskForm";
import type { CreateTaskCommentRequest, CreateTaskCommentResponse, EventTastCommentResponse, TaskCommentResponse } from "../types/task-comment";
import type { Media } from "../types/upload";

export type TaskStatus =
  | "pending_acceptance"
  | "accepted"
  | "todo"
  | "in_progress"
  | "done"
  | "rejected"
    | "cancel";

export type AssigneeInfo = { assignee_id: string; assignee_name: string };

export type AssigneeStatus = {
  assignee_id: string;
  assignee_name: string;
  status: TaskStatus;
  accepted_at?: string;
  rejected_at?: string;
  reject_reason?: string;
};
  
export type Task = {
    id: string;
    title: string;
    description: string;
    assignee_id: string;
    assignee_name: string; 
    assignees?: AssigneeStatus[];
    creator_id: string;
    creator_name?: string;
    group_id: string;
    status: TaskStatus;
    start_time?: string;
    end_time?: string;
    deadline?: string;
    priority?: string;
    attachment_ids?: string[];
    attachments?: Media[];
    created_at: string;
};

export const taskApi = {
    createTask: (data: Omit<TaskData, 'files'> & { group_id: string; attachment_ids?: string[] }) => {
        // Chuẩn hoá assignees sang format backend
        const assignees: AssigneeInfo[] = (data.assignees && data.assignees.length > 0)
            ? data.assignees.map(a => ({ assignee_id: a.user_id, assignee_name: a.display_name }))
            : [{ assignee_id: data.assignee_id, assignee_name: data.assignee_name }];

        return axiosClient.post("/tasks", {
            ...data,
            assignees,
        });
    },
    updateTaskStatus: (taskId: string, status: Task["status"], assigneeId?: string, rejectReason?: string) => {
        const payload: Record<string, string> = { status };
        if (assigneeId) payload.assignee_id = assigneeId;
        if (rejectReason) payload.reject_reason = rejectReason;
        return axiosClient.patch(`/tasks/${taskId}/status`, payload);
    },
    getTasks: (type: "assigned_to_me" | "assigned_by_me" = "assigned_to_me") => {
        return axiosClient.get("/tasks", { params: { type } });
    },
    getTaskComments: async (taskId: string,  limit?: number, page?: number): Promise<TaskCommentResponse> => {
        const response = await axiosClient.get<TaskCommentResponse>(`/task-comments`, {
            params: {
                task_id: taskId,
                limit: limit,
                page: page
            }
        });
        return response.data;
    },

    createTaskComment: async (taskRequest: CreateTaskCommentRequest ): Promise<CreateTaskCommentResponse> => {
        const response = await axiosClient.post<CreateTaskCommentResponse>(`/task-comments`,taskRequest );
        return response.data;
    },

    updateTaskComment: async (commentID: string, content:string ): Promise<EventTastCommentResponse> => {
        const response = await axiosClient.patch<EventTastCommentResponse>(`/task-comments/${commentID}`,{content} );
        return response.data;
    },
    deleteTaskComment: async (commentID: string): Promise<EventTastCommentResponse> => {
        const response = await axiosClient.delete<EventTastCommentResponse>(`/task-comments/${commentID}` );
        return response.data;
    },
};
