import type { GetPaginationUserResponse } from "../../types/admin/user";
import axiosClient from "../../utils/axiosClient";

export const userAdminApi = {
  getPagination: async (page: number, limit: number, q?: string, gender?: string, status?: string, fromDate?: string, toDate?: string): Promise<GetPaginationUserResponse> => {
    const response = await axiosClient.get<GetPaginationUserResponse>(`/admin/get-pagination`, {
      params: {
        page: page,
        limit: limit,
        q: q,
        gender: gender,
        status: status,
        from_date: fromDate,
        to_date: toDate
      }
    });
    return response.data
  },
  deleteUser: async (userId: string): Promise<any> => {
    const response = await axiosClient.delete(`/admin/user/${userId}`);
    return response.data;
  },
  updateUser: async (userId: string, formData: FormData): Promise<any> => {
    const response = await axiosClient.patch(
      `/admin/user/${userId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
  resetPassword: async (userId: string): Promise<any> => {
    const response = await axiosClient.post(`/admin/user/${userId}/reset-password`);
    return response.data;
  },
};
