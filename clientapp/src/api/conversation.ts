import type { ConversationResponse } from "../types/conversation";
import axiosClient from "../utils/axiosClient";

export const conversationApi = {
  getConversation: async (
    page: number = 1,
    limit: number = 10,
    keyword: string,
    tags: string[] = [],
    type: string = "",
    sort_by: string = ""
  ): Promise<ConversationResponse> => {
    const response = await axiosClient.get<ConversationResponse>(
      `/conversations/list`,
      {
        params: {
          page,
          limit,
          keyword,
          tags,
          type,
          sort_by
        },
      }
    );

    return response.data;
  },

  updateTags: async (target_id: string, is_group: boolean, tags: string[]) => {
    return await axiosClient.post("/conversations/tags", {
      target_id,
      is_group,
      tags,
    });
  },

  getTags: async () => {
    return await axiosClient.get("/conversations/tags");
  },
};