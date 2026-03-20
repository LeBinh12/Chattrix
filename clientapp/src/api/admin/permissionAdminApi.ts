import axiosClient from "../../utils/axiosClient";
import type {
  PermissionListResponse,
  PermissionResponse,
  CreatePermissionRequest,
  UpdatePermissionRequest,
} from "../../types/admin/role";

export const permissionAdminApi = {
  // Lấy danh sách permissions với phân trang và tìm kiếm
  getList: async (
    page: number = 1,
    limit: number = 10,
    search?: string,
    moduleId?: string
  ): Promise<PermissionListResponse> => {
    const response = await axiosClient.get<PermissionListResponse>(
      "/permissions",
      {
        params: {
          page,
          limit,
          search,
          module_id: moduleId === "all" ? undefined : moduleId,
        },
      }
    );
    return response.data;
  },

  // Lấy chi tiết permission
  getById: async (id: string): Promise<PermissionResponse> => {
    const response = await axiosClient.get<PermissionResponse>(
      `/permissions/${id}`
    );
    return response.data;
  },

  // Tạo permission mới
  create: async (
    data: CreatePermissionRequest
  ): Promise<PermissionResponse> => {
    const response = await axiosClient.post<PermissionResponse>(
      "/permissions",
      data
    );
    return response.data;
  },

  // Cập nhật permission
  update: async (
    id: string,
    data: UpdatePermissionRequest
  ): Promise<PermissionResponse> => {
    const response = await axiosClient.put<PermissionResponse>(
      `/permissions/${id}`,
      data
    );
    return response.data;
  },

  // Xóa permission
  delete: async (id: string): Promise<{ status: number; message: string }> => {
    const response = await axiosClient.delete<{
      status: number;
      message: string;
    }>(`/permissions/${id}`);
    return response.data;
  },
};
