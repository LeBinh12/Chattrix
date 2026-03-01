import axiosClient from "../../utils/axiosClient";
import type {
  RoleListResponse,
  RoleResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
} from "../../types/admin/role";

export const roleAdminApi = {
  // Lấy danh sách roles với phân trang và tìm kiếm
  getList: async (
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<RoleListResponse> => {
    const response = await axiosClient.get<RoleListResponse>("/roles", {
      params: {
        page,
        limit,
        search,
      },
    });
    return response.data;
  },

  // Lấy chi tiết role
  getById: async (id: string): Promise<RoleResponse> => {
    const response = await axiosClient.get<RoleResponse>(`/roles/${id}`);
    return response.data;
  },

  // Tạo role mới
  create: async (data: CreateRoleRequest): Promise<RoleResponse> => {
    const response = await axiosClient.post<RoleResponse>("/roles", data);
    return response.data;
  },

  // Cập nhật role
  update: async (
    id: string,
    data: UpdateRoleRequest
  ): Promise<RoleResponse> => {
    const response = await axiosClient.put<RoleResponse>(`/roles/${id}`, data);
    return response.data;
  },

  // Xóa role
  delete: async (id: string): Promise<{ status: number; message: string }> => {
    const response = await axiosClient.delete<{
      status: number;
      message: string;
    }>(`/roles/${id}`);
    return response.data;
  },

  // Lấy danh sách roles cho form chỉnh sửa user 
  getListForUpdate: async (): Promise<RoleListResponse> => {
    const response = await axiosClient.get<RoleListResponse>("/admin/roles-for-update");
    return response.data;
  },
};
