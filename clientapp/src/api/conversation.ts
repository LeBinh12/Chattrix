import { API_URL } from "../config/config";
import type { ConversationResponse } from "../types/conversation";
import axiosClient from "../utils/axiosClient";

export const conversationApi = {
  getConversation: async (
    page: number = 1,
    limit: number = 10,
    keyword: string
  ): Promise<ConversationResponse> => {
    const response = await axiosClient.get<ConversationResponse>(
      `${API_URL}/conversations/list`,
      {
        params: {
          page,
          limit,
          keyword
        },
      }
    );

    return response.data;
  },
};