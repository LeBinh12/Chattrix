export interface PermissionMatrixRole {
  id: string;
  name: string;
}

export interface PermissionMatrixPermission {
  id: string;
  key: string;
  name: string;
  checked_role_ids: string[];
}

export interface PermissionMatrixModule {
  id: string;
  name: string;
  permissions: PermissionMatrixPermission[];
}

export interface PermissionMatrixData {
  roles: PermissionMatrixRole[];
  modules: PermissionMatrixModule[];
}

export interface PermissionMatrixResponse {
  status: number;
  message: string;
  data: PermissionMatrixData;
}

export interface UpdatePermissionMatrixRequest {
  roles: Array<{
    role_id: string;
    permission_ids: string[];
  }>;
}

export interface UpdatePermissionMatrixResponse {
  status: number;
  message: string;
  data: {
    success: boolean;
    message: string;
    updated_roles: number;
  };
}
