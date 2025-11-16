import { API_URL } from "../config/config";
import type { GetSettingResponse, UpsertSettingRequest, UpsertSettingResponse } from "../types/setting";
import type { UserResponse, UserStatusResponse } from "../types/user";
import axiosClient from "../utils/axiosClient";

export const userApi = {
    getProfile: async (): Promise<UserResponse> => {
        const response = await axiosClient.get<UserResponse>(`${API_URL}/users/profile`);
        return response.data
    },
    getStatus: async (): Promise<UserStatusResponse> => {
        const response = await axiosClient.get<UserStatusResponse>(`${API_URL}/user-status/status`);
        return response.data
    },
    upsertSetting: async (res: UpsertSettingRequest): Promise<UpsertSettingResponse> => {
        const response = await axiosClient.post<UpsertSettingResponse>(`${API_URL}/users/upsert-setting`, res);
        return response.data
    },
    getSetting: async (target_id: string, is_group: boolean): Promise<GetSettingResponse> => {
        const response = await axiosClient.get<GetSettingResponse>(`${API_URL}/users/get-setting`, {
            params: {
                target_id: target_id,
                is_group: is_group
            }
        });
        return response.data
    },


}