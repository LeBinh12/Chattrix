import type { SearchApiResponse } from "../types/search";
import axiosClient from "../utils/axiosClient";

export const searchApi = {
    search: async (
        receiver_id?: string, content?: string, group_id?: string
    ): Promise<SearchApiResponse> => {
        const response = await axiosClient.get<SearchApiResponse>(
            `/message/search`,
            {
                params: {
                    receiver_id: receiver_id,
                    content: content,
                    group_id: group_id
                }
            }
        );

        return response.data;
    },
};