export interface TaskComment {
        id: string;
        task_id: string;
        user_id: string;
        user_name: string;
        user_avatar: string;
        content: string;
        reply_to_id: string;
        reply_to_user_id: string;
        reply_to_avatar: string;
        reply_to_content: string;
        reply_to_username: string;
        created_at: string;
        updated_at: string;


    /// Websocket
    sender_id?: string;
    group_id?: string;
    receiver_id?: string;
    type_act: "created" | "updated" | "deleted" | "system";
}


export interface TaskCommentData {
    data: TaskComment[];
    page: number;
    limit: number;
    total: number;
}

export interface TaskCommentResponse {
    status: number;
    message: string;
    data: TaskCommentData;
}



export interface CreateTaskCommentRequest {
    content: string;
    task_id: string;
    attachment_ids?: string[];
    reply_to_id?: string | null;
    reply_to_avatar?: string | null;
    reply_to_content?: string | null;
    reply_to_username?: string | null;
}

export interface CreateTaskCommentResponse {
    status: number;
    message: string;
    data: TaskComment;
}

export interface EventTastCommentResponse {
    status: number;
    message: string;
    data: boolean;
}

