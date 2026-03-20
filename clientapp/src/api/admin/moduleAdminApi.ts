import axiosClient from "../../utils/axiosClient";

export interface PermissionModule {
  id: string;
  code: string;
  name: string;
  description: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ModuleListResponse {
  status: number;
  message: string;
  data: {
    items: PermissionModule[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

export interface ModuleResponse {
  status: number;
  message: string;
  data: PermissionModule;
}

export interface CreateModuleRequest {
  code: string;
  name: string;
  description?: string;
  display_order?: number;
}

export interface UpdateModuleRequest {
  code?: string;
  name?: string;
  description?: string;
  display_order?: number;
}

export const moduleAdminApi = {
  getAll: async (): Promise<PermissionModule[]> => {
    const response = await axiosClient.get<ModuleListResponse>("/modules", {
      params: {
        page: 1,
        limit: 100,
      },
    });
    return response.data.data.items;
  },

  getList: async (
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<ModuleListResponse> => {
    const response = await axiosClient.get<ModuleListResponse>("/modules", {
      params: {
        page,
        limit,
        search,
      },
    });
    return response.data;
  },

  getById: async (id: string): Promise<ModuleResponse> => {
    const response = await axiosClient.get<ModuleResponse>(`/modules/${id}`);
    return response.data;
  },

  create: async (data: CreateModuleRequest): Promise<ModuleResponse> => {
    const response = await axiosClient.post<ModuleResponse>("/modules", data);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateModuleRequest
  ): Promise<ModuleResponse> => {
    const response = await axiosClient.put<ModuleResponse>(
      `/modules/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<{ status: number; message: string }> => {
    const response = await axiosClient.delete<{
      status: number;
      message: string;
    }>(`/modules/${id}`);
    return response.data;
  },
};
