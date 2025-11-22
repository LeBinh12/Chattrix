import type { GetPaginationUserResponse } from "../../types/admin/user";
import axiosClient from "../../utils/axiosClient";


export const userAdminApi = {
    getPagination: async (page: number, limit: number): Promise<GetPaginationUserResponse> => {
        const response = await axiosClient.get<GetPaginationUserResponse>(`/admin/get-pagination`, {
            params: {
                page: page,
                limit: limit
            }
        });
        return response.data
    },
}