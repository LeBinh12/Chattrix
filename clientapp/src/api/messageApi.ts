import type { MediaListResponse } from "../types/media";
import type { MessageIDResponse, MessageResponse } from "../types/Message";
import type { PinnedMessageResponse } from "../types/pinned_message";
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
    getMessageBelow: async (renderId: string, groupID: string, limit: number, afterTime?: string): Promise<MessageResponse> => {
        const response = await axiosClient.get<MessageResponse>(`/message/get-message-below`, {
            params: {
                receiver_id: renderId,
                group_id: groupID,
                limit: limit,
                afterTime: afterTime
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
    },
    getPinned: async (renderId: string, groupID: string): Promise<PinnedMessageResponse> => {
        const response = await axiosClient.get<PinnedMessageResponse>(`/message/pinned`, {
            params: {
                receiver_id: renderId,
                group_id: groupID,
            }
        });

        return response.data;
    },

    getMediaList: async (renderId?: string, groupID?: string, limit?: number, media_type?: string): Promise<MediaListResponse> => {
        const response = await axiosClient.get<MediaListResponse>(`/message/media-list`, {
            params: {
                receiver_id: renderId,
                group_id: groupID,
                limit: limit,
                media_type: media_type
            }
        });

        return response.data;
    },

}