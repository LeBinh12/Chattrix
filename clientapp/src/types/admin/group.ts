export interface GroupDetail {
    id: string;
    name: string;
    image: string | null; // có thể là "null" string từ backend
    members_count: number;
    messages_count: number;
}

export interface ListGroupsResponseData {
    data: GroupDetail[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface ListGroupsResponse {
    status: number;
    message: string;
    data: ListGroupsResponseData;
}