import type { ListGroupsResponse } from "../../types/admin/group";
import type { ListGroupMembersResponse } from "../../types/admin/groupNumber";
import axiosClient from "../../utils/axiosClient";


export const groupAdminApi = {
    getPagination: async (page: number, limit: number, name?: string, min_member?: number, max_member?: number): Promise<ListGroupsResponse> => {
        const response = await axiosClient.get<ListGroupsResponse>(`/admin/get-group`, {
            params: {
                page: page,
                limit: limit,
                name: name,
                min_member: min_member,
                max_member: max_member
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