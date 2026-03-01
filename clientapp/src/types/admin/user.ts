export interface GetPaginationUserResponse {
  status: number;
  message: string;
  data: PaginationUserResponse;
}

export interface PaginationUserResponse {
  limit: number;
  page: number;
  total: number;
  users: UserStatus[];
}

// Role info - trả về từ API kèm id, code, name
export interface RoleInfo {
  id: string;
  code: string; // Dùng cho phân quyền logic
  name: string; // Dùng cho hiển thị UI
}

export interface UserStatus {
  user: UserAdmin;
  status: string;
  last_login?: string;
  messages_count: number;
  roles?: RoleInfo[];
}

export interface UserAdmin {
  id: string;
  created_at: string;
  updated_at: string;
  username: string;
  email: string;
  avatar: string;
  phone: string;
  display_name: string;
  description?: string; 
  birthday: string;
  gender: string;
  is_completed_friend_setup: boolean;
  is_profile_complete: boolean;
  roles?: RoleInfo[]; // Danh sách role objects
}
