import type { CreateGroupResponse, GetAllGroupResponse, GetAllNotNumberGroup } from "../types/group";
import type { ListGroupMembersResponse } from "../types/group-member";
import axiosClient from "../utils/axiosClient";

export const groupApi = {
    getGroup: async (): Promise<GetAllGroupResponse> => {
        const response = await axiosClient.get<GetAllGroupResponse>(`/group/get-all`);
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
}