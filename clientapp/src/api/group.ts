import type { CreateGroupResponse, GetAllGroupResponse, GetAllNotNumberGroup } from "../types/group";
import type { ListGroupMembersResponse } from "../types/group-member";
import axiosClient from "../utils/axiosClient";

export const groupApi = {
    getGroup: async (page = 1, limit = 10): Promise<GetAllGroupResponse> => {
        const response = await axiosClient.get<GetAllGroupResponse>(`/group/get-all`, {
            params: { page, limit }
        });
        return response.data
    },

    addGroup: async (formData: FormData): Promise<CreateGroupResponse> => {
        const response = await axiosClient.post<CreateGroupResponse>(`/group/add`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },
    getNumber: async (group_id: string, page: number, size: number): Promise<GetAllNotNumberGroup> => {
        const response = await axiosClient.get<GetAllNotNumberGroup>(`/group/not-in-group`, {
            params: {
                group_id: group_id,
                page: page,
                size: size
            }
        });
        return response.data
    },
    getGroupMembers: async (group_id: string, page = 1, limit = 20, keyword?: string): Promise<ListGroupMembersResponse> => {
        const response = await axiosClient.get<ListGroupMembersResponse>(`/group/list-group-member`, {
            params: { group_id, page, limit, keyword }
        });
        return response.data;
    },

    addMember: async (data: {
        group_id: string;
        user_id: string;
        role?: string;
    }) => {
        const response = await axiosClient.post(`/group/add-number`, data);
        return response.data;
    },

    removeMember: async (group_id: string, user_id: string) => {
        const response = await axiosClient.delete(`/group/remove-member`, {
            params: { group_id, user_id }
        });
        return response.data;
    },

    promoteAdmin: async (group_id: string, user_id: string) => {
        const response = await axiosClient.post(`/group/promote-admin`, null, {
            params: { group_id, user_id }
        });
        return response.data;
    },

    transferOwner: async (group_id: string, user_id: string) => {
        const response = await axiosClient.post(`/group/transfer-owner`, null, {
            params: { group_id, user_id }
        });
        return response.data;
    },

    dissolveGroup: async (group_id: string) => {
        const response = await axiosClient.delete(`/group/dissolve`, {
            params: { group_id }
        });
        return response.data;
    },
}