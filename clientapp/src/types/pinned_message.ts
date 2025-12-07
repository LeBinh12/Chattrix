export interface PinnedMessageDetail {
    pin_id: string;
    message_id: string;
    conversation_id: string;

    content: string;
    sender_id: string;
    sender_name: string;

    pinned_by_id: string;
    pinned_by_name: string;

    pinned_at: string;     // ISO date
    note?: string;

    message_type: string;
    created_at: string;    // ISO date
}

export interface PinnedMessageData {
    count: number;
    data: PinnedMessageDetail[];
}

export interface PinnedMessageResponse {
    status: number;
    message: string;
    data: PinnedMessageData;
}
