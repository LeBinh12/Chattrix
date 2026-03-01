import type { GetSettingResponse, UpsertSettingRequest, UpsertSettingResponse } from "../types/setting";
import type { UserResponse, UserStatusResponse } from "../types/user";
import axiosClient from "../utils/axiosClient";

export const userApi = {
    getProfile: async (): Promise<UserResponse> => {
        const response = await axiosClient.get<UserResponse>(`/users/profile`);
        return response.data
    },
    getStatus: async (): Promise<UserStatusResponse> => {
        const response = await axiosClient.get<UserStatusResponse>(`/user-status/status`);
        return response.data
    },
    updateProfile: async (formData: FormData): Promise<UserResponse> => {
        const response = await axiosClient.patch<UserResponse>(`/users/update-profile`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return response.data
    },
    upsertSetting: async (res: UpsertSettingRequest): Promise<UpsertSettingResponse> => {
        const response = await axiosClient.post<UpsertSettingResponse>(`/users/upsert-setting`, res);
        return response.data
    },
    getSetting: async (target_id?: string, is_group?: boolean): Promise<GetSettingResponse> => {
        const response = await axiosClient.get<GetSettingResponse>(`/users/get-setting`, {
            params: {
                target_id: target_id,
                is_group: is_group
            }
        });
        return response.data
    },
    changePassword: async (data: {old_password: string, new_password: string}): Promise<any> => {
        const response = await axiosClient.patch(`/users/change-password`, data);
        return response.data;
    },
    getPagination: async (page = 1, limit = 10): Promise<any> => {
        const response = await axiosClient.get(`/users/get-pagination`, {
            params: { page, limit }
        });
        return response.data;
    }
}