import type { User } from "./user";

export interface CreateGroupResponse {
    status: number;
    message: string;
    data: Group;
}

export interface GetAllGroupResponse {
    status: number;
    message: string;
    data: Group[];
}

export interface Group {
    id: string,
    created_at: string,
    updated_at: string,
    name: string,
    image: string,
    creator_id: string,
}

export interface GetAllNotNumberGroup {
    status: number;
    message: string;
    data: User[];
}