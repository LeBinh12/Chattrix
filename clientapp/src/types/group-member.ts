// Trạng thái online
export type OnlineStatus = "online" | "offline";

// Vai trò trong group
export type GroupRole = "owner" | "admin" | "member";

// Trạng thái member
export type GroupMemberStatus = "active" | "inactive" | "blocked";

// Member trong group (trừ chính mình)
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;

  role: GroupRole;
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

// Response API chuẩn backend của bạn
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
