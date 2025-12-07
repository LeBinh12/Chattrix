export interface MediaItem {
    id: string;
    type: "image" | "video";
    url: string;
    filename: string;
    timestamp: string;
}

export interface FileItem {
    name: string;
    size: string;
    url: string;
    timestamp: string;
}


export interface MediaItemDTO {
    id: string;
    message_id: string;
    sender_id: string;
    created_at: number;
    type: "image" | "video" | "file";
    filename: string;
    size: number;
    url: string;
    is_read: boolean;
    content?: string; // optional vì không phải media nào cũng có
}

export interface MediaListData {
    count: number;
    data: MediaItemDTO[];
    limit: number;
    page: number;
}

export interface MediaListResponse {
    status: number;
    message: string;
    data: MediaListData;
}
