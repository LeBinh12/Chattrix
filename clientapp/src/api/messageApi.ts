import type { MessageResponse } from "../types/Message";
import axiosClient from "../utils/axiosClient";

export const messageAPI = {
    getMessage: async (renderId: string, groupID: string, limit: number, beforeTime?: string): Promise<MessageResponse> => {
        const response = await axiosClient.get<MessageResponse>(`/message/get-message`, {
            params: {
                receiver_id: renderId,
                group_id: groupID,
                limit: limit,
                beforeTime: beforeTime
            }
        });

        return response.data;
    }
}