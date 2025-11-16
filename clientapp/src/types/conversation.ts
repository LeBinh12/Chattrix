export interface ConversationResponse {
    status: number;
    message: string;
    data: {
        total: number;
        page: number;
        limit: number;
        data: Conversation[];
    };
}

export interface Conversation {
    user_id: string,
    sender_id: string,
    group_id: string,
    display_name: string,
    avatar: string,
    last_message: string,
    last_date: string,
    unread_count: number,
    status: string,
    updated_at: string,
    last_message_type: string,
}