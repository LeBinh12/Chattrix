export interface UserResponse {
    status: number,
    message: string,
    data: User & { permissions?: string[] }
}

export interface UserStatusResponse {
    status: number,
    message: string,
    data: UserStatus[],
}

export interface UserStatus {
    user_id: string;
    name: string;
    avatar: string;
    status: string;
    updated_at: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    avatar: string;
    phone: string;
    display_name: string;
    birthday: string;
    gender: string;
    is_completed_friend_setup: boolean;
    is_profile_complete: boolean;
    is_deleted?: boolean;
    roles?: string[];
    permissions?: string[];
}