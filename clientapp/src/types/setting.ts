export interface UpsertSettingResponse {
    status: number;
    message: string;
    data: boolean
}
export interface UpsertSettingRequest {
    user_id: string;
    target_id: string;
    is_group: boolean;
    is_muted: boolean;
    mute_until?: string
}

export interface GetSettingResponse {
    status: number;
    message: string;
    data: Setting
}

export interface Setting {
    target_id: string;
    is_group: boolean;
    is_muted: boolean;
    mute_until: string
}