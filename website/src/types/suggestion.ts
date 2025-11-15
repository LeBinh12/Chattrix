
export interface SuggestFriendResponse {
    status: number;
    message: string;
    data: {
        total: number;
        page: number;
        limit: number;
        data: UserData[];
    };
}

export interface UserData {
    id: string;
    username: string;
    email: string;
    avatar: string;
    phone: string;
    display_name: string;
    birthday: string;
    gender: string;
    is_completed_friend_setup: boolean;
}