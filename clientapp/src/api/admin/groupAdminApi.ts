import type { ListGroupsResponse } from "../../types/admin/group";
import type { ListGroupMembersResponse } from "../../types/admin/groupNumber";
import axiosClient from "../../utils/axiosClient";


export const groupAdminApi = {
    getPagination: async (page: number, limit: number): Promise<ListGroupsResponse> => {
        const response = await axiosClient.get<ListGroupsResponse>(`/admin/get-group`, {
            params: {
                page: page,
                limit: limit
            }
        });
        return response.data
    },
    getNumber: async (groupID: string, page: number, limit: number): Promise<ListGroupMembersResponse> => {
        const response = await axiosClient.get<ListGroupMembersResponse>(`/admin/get-number-group?groupID=${groupID}`, {
            params: {
                page: page,
                limit: limit
            }
        });
        return response.data
    },
}