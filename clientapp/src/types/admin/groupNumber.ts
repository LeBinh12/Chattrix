// types/admin/groupMember.ts

export interface UserInfoInGroup {
    id: string;        // ID của GroupMember
    user_id: string;   // ID người dùng
    display_name: string;
    email: string;
    avatar: string | null;
    joined_at: string; // ISO date string
    role: string;
    status: string;
}

export interface ListGroupMembersResponseData {
    data: UserInfoInGroup[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface ListGroupMembersResponse {
    status: number;
    message: string;
    data: ListGroupMembersResponseData;
}
