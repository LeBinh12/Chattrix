import { useRecoilValue } from "recoil";
import { userAtom } from "../recoil/atoms/userAtom";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  filterMenuByPermissions,
  ADMIN_MENU_ITEMS,
} from "../constants/menuPermissions";
import type { PermissionType, MenuItem } from "../constants/menuPermissions";


export const usePermissions = () => {
  const user = useRecoilValue(userAtom);
  const currentUser = user?.data || null;

 
  const userPermissions = (currentUser as any)?.permissions || [];
  const userRoles = currentUser?.roles?.map((r: any) => 
    typeof r === "string" ? r : r.code
  ) || [];

  return {
 
    userPermissions,
    userRoles,
    currentUser,

    hasPermission: (permission: PermissionType | string) =>
      hasPermission(userPermissions, permission),

    hasAnyPermission: (permissions: (PermissionType | string)[]) =>
      hasAnyPermission(userPermissions, permissions),

    hasAllPermissions: (permissions: (PermissionType | string)[]) =>
      hasAllPermissions(userPermissions, permissions),

    getAccessibleMenuItems: (): MenuItem[] =>
      filterMenuByPermissions(ADMIN_MENU_ITEMS, userRoles, userPermissions),

    canAccessAdminPanel: (): boolean =>
      hasPermission(userPermissions, "system:admin:access_admin_panel"),
  };
};
