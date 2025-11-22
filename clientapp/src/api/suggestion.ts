import type { SuggestFriendResponse } from "../types/suggestion";
import axiosClient from "../utils/axiosClient";

export const suggestionApi = {
  getSuggestion: async (
    userID: string,
    keyword: string = "",
    page: number = 1,
    limit: number = 10
  ): Promise<SuggestFriendResponse> => {
    const response = await axiosClient.get<SuggestFriendResponse>(
      `/friend/suggestions`,
      {
        params: {
          user_id: userID,
          keyword,
          page,
          limit,
        },
      }
    );

    return response.data;
  },
};