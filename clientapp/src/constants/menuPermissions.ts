import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import GridOnRoundedIcon from "@mui/icons-material/GridOnRounded";

// Định nghĩa các roles trong hệ thống (Mapping với Code trong Database)
export const ROLES = {
  SYSTEM_ADMIN: "system_admin",
  CLINIC_ADMIN: "clinic_admin",
  DENTIST: "dentist",
  RECEPTIONIST: "receptionist",
  ASSISTANT: "assistant",
  CUSTOMER: "app.customer",
  USER: "user",
  GROUP_OWNER: "owner",
  GROUP_ADMIN: "admin",
  GROUP_MEMBER: "member",
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];


export const PERMISSIONS = {
  // System Admin
  ACCESS_ADMIN_PANEL: "system:admin:access_admin_panel",
  ADMIN_DASHBOARD: "system:admin:dashboard",
  
  // System User
  USER_VIEW_ALL: "system:user:view_all",
  USER_CREATE: "system:user:create",
  USER_UPDATE_GLOBAL: "system:user:update_global",
  USER_DELETE: "system:user:delete",
  USER_RESET_PASSWORD: "system:user:reset_password",
  // USER_FORCE_LOGOUT: "system:user:force_logout",
  USER_VIEW_DETAILS: "system:user:view_details",
  
  // System Group
  GROUP_VIEW_ALL: "system:group:view_all",
  GROUP_VIEW_DETAILS: "system:group:view_details",
  // GROUP_FORCE_DELETE: "system:group:force_delete",
  GROUP_RESOLVE_REPORT: "system:group:resolve_report",
  GROUP_CHANGE_OWNER: "system:group:change_owner",
  GROUP_LOCK: "system:group:lock",
  
  // System Role
  ROLE_VIEW: "system:role:view",
  ROLE_CREATE: "system:role:create",
  ROLE_UPDATE: "system:role:update",
  ROLE_DELETE: "system:role:delete",
  
  // System Permission
  PERMISSION_VIEW: "system:permission:view",
  PERMISSION_CREATE: "system:permission:create",
  PERMISSION_UPDATE: "system:permission:update",
  PERMISSION_DELETE: "system:permission:delete",
  
  // System Module
  MODULE_VIEW: "system:module:view",
  MODULE_CREATE: "system:module:create",
  MODULE_UPDATE: "system:module:update",
  MODULE_DELETE: "system:module:delete",
  
  // System Permission Matrix
  MATRIX_VIEW: "system:matrix:view",
  MATRIX_UPDATE: "system:matrix:update",
  
  // System Log
  LOG_VIEW: "system:log:view",
  
  // System Settings
  SETTING_VIEW: "system:setting:view",
  SETTING_CONFIG: "system:setting:config",
  MODERATOR_ASSIGN: "system:moderator:assign",
} as const;

export type PermissionType = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];


export interface MenuItem {
  id: string;
  path: string;
  label: string;
  icon?: any;
  requiredRoles?: RoleType[];
  requiredPermissions?: PermissionType[];
  description?: string;
}


export const ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    id: "dashboard",
    path: "/admin",
    label: "Thống kê",
    icon: HomeRoundedIcon, 
    requiredPermissions: [PERMISSIONS.ACCESS_ADMIN_PANEL, PERMISSIONS.ADMIN_DASHBOARD],
    description: "Xem tổng quan và thống kê hệ thống",
  },
  {
    id: "user-management",
    path: "/admin/manager-user",
    label: "Quản lý người dùng",
    icon: ManageAccountsRoundedIcon, 
    requiredPermissions: [PERMISSIONS.USER_VIEW_ALL],
    description: "Quản lý tài khoản người dùng",
  },
  {
    id: "group-management",
    path: "/admin/manager-group",
    label: "Quản lý nhóm",
    icon: ForumRoundedIcon, 
    requiredPermissions: [PERMISSIONS.GROUP_VIEW_ALL],
    description: "Quản lý các nhóm chat",
  },
  // {
  //   id: "system-logs",
  //   path: "/admin/manager-system-logs",
  //   label: "Nhật Ký Hệ Thống",
  //   icon: DescriptionRoundedIcon,
  //   requiredRoles: [ROLES.SYSTEM_ADMIN],
  //   requiredPermissions: [PERMISSIONS.LOG_VIEW],
  //   description: "Xem nhật ký hoạt động hệ thống",
  // },
  // {
  //   id: "notifications",
  //   path: "/admin/manager-notification",
  //   label: "Thông Báo",
  //   icon: NotificationsRoundedIcon,
  //   requiredRoles: [ROLES.SYSTEM_ADMIN, ROLES.CLINIC_ADMIN],
  //   description: "Quản lý thông báo hệ thống",
  // },
  {
    id: "role-management",
    path: "/admin/manager-role",
    label: "Quản lý vai trò",
    icon: VerifiedUserRoundedIcon,
    requiredPermissions: [PERMISSIONS.ROLE_VIEW],
    description: "Quản lý các vai trò trong hệ thống",
  },
  {
    id: "permission-management",
    path: "/admin/manager-permission",
    label: "Quản lý quyền hạn",
    icon: SecurityRoundedIcon,
    requiredPermissions: [PERMISSIONS.PERMISSION_VIEW],
    description: "Quản lý quyền hạn và permissions",
  },
  {
    id: "module-management",
    path: "/admin/manager-module",
    label: "Quản lý nhóm quyền",
    icon: GroupsRoundedIcon,
    requiredPermissions: [PERMISSIONS.MODULE_VIEW],
    description: "Quản lý các module và nhóm quyền",
  },
  {
    id: "permission-matrix",
    path: "/admin/permission-matrix",
    label: "Ma trận phân quyền",
    icon: GridOnRoundedIcon,
    requiredPermissions: [PERMISSIONS.MATRIX_VIEW],
    description: "Xem và cấu hình ma trận phân quyền",
  },
];


export const hasRole = (userRoles: string[] | undefined, requiredRole: RoleType): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.includes(requiredRole);
};


export const hasMenuAccess = (
  menuItem: MenuItem,
  userRoles?: string[]
): boolean => {

  if (!menuItem.requiredRoles || menuItem.requiredRoles.length === 0) {
    return true;
  }


  if (!userRoles || userRoles.length === 0) {
    return false;
  }


  if (userRoles.includes(ROLES.SYSTEM_ADMIN)) {
    return true;
  }


  return menuItem.requiredRoles.some((requiredRole) =>
    userRoles.includes(requiredRole)
  );
};


export const filterMenuByRoles = (
  menuItems: MenuItem[],
  userRoles?: string[]
): MenuItem[] => {
  return menuItems.filter((item) => hasMenuAccess(item, userRoles));
};


export const isAdmin = (userRoles?: string[]): boolean => {
  return userRoles?.includes(ROLES.SYSTEM_ADMIN) ?? false;
};


export const canAccessAdminPanel = ( userPermissions?: string[]): boolean => {
  if (userPermissions && userPermissions.includes(PERMISSIONS.ACCESS_ADMIN_PANEL)) {
    return true;
  }
  return false;
};


export const hasPermission = (
  userPermissions: string[] | undefined,
  requiredPermission: PermissionType | string
): boolean => {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  return userPermissions.includes(requiredPermission);
};


export const hasAnyPermission = (
  userPermissions: string[] | undefined,
  requiredPermissions: (PermissionType | string)[]
): boolean => {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  return requiredPermissions.some((perm) => userPermissions.includes(perm));
};


export const hasAllPermissions = (
  userPermissions: string[] | undefined,
  requiredPermissions: (PermissionType | string)[]
): boolean => {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  return requiredPermissions.every((perm) => userPermissions.includes(perm));
};


export const filterMenuByPermissions = (
  menuItems: MenuItem[],
  userRoles?: string[],
  userPermissions?: string[]
): MenuItem[] => {
  return menuItems.filter((item) => {
  
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      const hasRole = !userRoles || userRoles.length === 0 
        ? false 
        : userRoles.includes(ROLES.SYSTEM_ADMIN) || 
          item.requiredRoles.some((role) => userRoles.includes(role));
      
      if (!hasRole) return false;
    }

   
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      const hasRequiredPermission = hasAnyPermission(
        userPermissions,
        item.requiredPermissions
      );
      
      if (!hasRequiredPermission) return false;
    }

    return true;
  });
};
