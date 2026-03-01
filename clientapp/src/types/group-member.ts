// Online status
export type OnlineStatus = "online" | "offline";

// Roles in group
export type GroupRole = "owner" | "admin" | "member" | "number";

// Member status
export type GroupMemberStatus = "active" | "inactive" | "blocked";

export interface RoleInfo {
  code: string;
  name: string;
  permissions: string[];
}

// Group member (excluding self)
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;

  role: GroupRole;
  role_info?: RoleInfo;
  status: GroupMemberStatus;
  joined_at: string; // ISO date

  username: string;
  display_name: string;
  email: string;
  avatar: string | null;
  phone: string;

  online_status: OnlineStatus;
  last_online_at: string | null;
}

// Standard backend API response
export interface ListGroupMembersResponse {
  status: number;
  message: string;
  data: {
    members: GroupMember[],
    page: number,
    limit: number,
    total: number
  };
}
