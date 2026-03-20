import axiosClient from "../../utils/axiosClient";
import type {
  PermissionMatrixResponse,
  UpdatePermissionMatrixRequest,
  UpdatePermissionMatrixResponse,
} from "../../types/admin/permissionMatrix";

export const permissionMatrixApi = {
  // Lấy permission matrix
  get: async (): Promise<PermissionMatrixResponse> => {
    const response = await axiosClient.get<PermissionMatrixResponse>(
      "/permission-matrix"
    );
    return response.data;
  },

  // Cập nhật permission matrix
  update: async (
    data: UpdatePermissionMatrixRequest
  ): Promise<UpdatePermissionMatrixResponse> => {
    const response = await axiosClient.put<UpdatePermissionMatrixResponse>(
      "/permission-matrix",
      data
    );
    return response.data;
  },
};
