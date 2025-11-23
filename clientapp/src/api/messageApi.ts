import type { MessageIDResponse, MessageResponse } from "../types/Message";
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
    },

    getMessageById: async (renderId: string, groupID: string, messageID: string,): Promise<MessageIDResponse> => {
        const response = await axiosClient.get<MessageIDResponse>(`/message/get-message-by-id`, {
            params: {
                receiver_id: renderId,
                group_id: groupID,
                message_id: messageID
            }
        });

        return response.data;
    }
}