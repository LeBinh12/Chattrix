export interface GetPaginationUserResponse {
    status: number;
    message: string;
    data: PaginationUserResponse;
}

export interface PaginationUserResponse {
    limit: number;
    page: number;
    total: number;
    users: UserStatus[];
}

export interface UserStatus {
    user: UserAdmin;
    status: string;
    messages_count: number
}

export interface UserAdmin {
    id: string;
    created_at: string;
    updated_at: string;
    username: string;
    email: string;
    avatar: string;
    phone: string;
    display_name: string;
    birthday: string;
    gender: string;
    is_completed_friend_setup: boolean;
    is_profile_complete: boolean; // boolean thay vì string
}
