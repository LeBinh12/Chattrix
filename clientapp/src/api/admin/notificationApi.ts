
import type { ChannelNotificationResponse } from "../../types/admin/notification";
import axiosClient from "../../utils/axiosClient";


export const notificationApi = {
    registerChannel: async (formData: FormData): Promise<ChannelNotificationResponse> => {
        const response = await axiosClient.post<ChannelNotificationResponse>(`/users/register-notification`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return response.data;
    },
}