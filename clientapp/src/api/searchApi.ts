import type { SearchApiResponse } from "../types/search";
import axiosClient from "../utils/axiosClient";

export const searchApi = {
    search: async (
        receiver_id?: string | null,
        content?: string | null,
        group_id?: string | null,
        cursor?: string | null   // ✔ CHO PHÉP NULL
    ): Promise<SearchApiResponse> => {
        const response = await axiosClient.get<SearchApiResponse>(
            `/message/search`,
            {
                params: {
                    receiver_id: receiver_id,
                    content: content,
                    group_id: group_id,
                    cursor_time: cursor
                }
            }
        );

        return response.data;
    },
};