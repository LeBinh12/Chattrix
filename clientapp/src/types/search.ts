export interface Search {
    id: string;
    sender_id: string;
    sender_name: string;
    sender_avatar: string | null;
    receiver_id: string;
    group_id: string;
    content: string;
    content_raw: string;
    created_at: string;
}

export interface SearchData {
    count: number;
    data: Search[];
    limit: number;
    next_cursor: string | number | null;
}

export interface SearchApiResponse {
    status: number;
    message: string;
    data: SearchData;
}
