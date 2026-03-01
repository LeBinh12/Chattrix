export interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  module_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RoleListResponse {
  status: number;
  message: string;
  data: {
    items: Role[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

export interface PermissionListResponse {
  status: number;
  message: string;
  data: {
    items: Permission[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

export interface RoleResponse {
  status: number;
  message: string;
  data: Role;
}

export interface PermissionResponse {
  status: number;
  message: string;
  data: Permission;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  code?: string;
  name?: string;
  description?: string;
}

export interface CreatePermissionRequest {
  code: string;
  name: string;
  description?: string;
  module_id?: string;
}

export interface UpdatePermissionRequest {
  code?: string;
  name?: string;
  description?: string;
  module_id?: string;
}
