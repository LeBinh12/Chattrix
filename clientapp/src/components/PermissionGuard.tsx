import type { ReactNode } from "react";
import React from "react";
import { Box, Typography, Alert } from "@mui/joy";
import { usePermissions } from "../hooks/usePermissions";
import type { PermissionType } from "../constants/menuPermissions";

interface PermissionGuardProps {
  permission?: PermissionType | string;
  anyPermission?: (PermissionType | string)[];
  allPermissions?: (PermissionType | string)[]
  children: ReactNode;
  fallback?: ReactNode;
  showAlert?: boolean;
}


export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  anyPermission,
  allPermissions,
  children,
  fallback,
  showAlert = false,
}) => {
  const { hasPermission: checkPermission, hasAnyPermission: checkAny, hasAllPermissions: checkAll } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = checkPermission(permission);
  } else if (anyPermission) {
    hasAccess = checkAny(anyPermission);
  } else if (allPermissions) {
    hasAccess = checkAll(allPermissions);
  } else {

    hasAccess = true;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (showAlert) {
    return (
      <Alert
        color="warning"
        variant="soft"
        sx={{
          my: 2,
          borderRadius: "8px",
        }}
      >
        <Typography level="body-sm">
          Bạn không có quyền truy cập chức năng này
        </Typography>
      </Alert>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
};

/**
 * HOC to wrap pages with permission checking
 * Usage:
 * export default withPermissionGuard(UserManagementPage, "system:user:view_all");
 */
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  permission?: PermissionType | string,
  options?: {
    anyPermission?: (PermissionType | string)[];
    allPermissions?: (PermissionType | string)[];
    fallback?: ReactNode;
    redirectTo?: string;
  }
) {
  return (props: P) => {
    const { hasPermission: checkPermission, hasAnyPermission: checkAny, hasAllPermissions: checkAll } = usePermissions();

    let hasAccess = false;

    if (permission) {
      hasAccess = checkPermission(permission);
    } else if (options?.anyPermission) {
      hasAccess = checkAny(options.anyPermission);
    } else if (options?.allPermissions) {
      hasAccess = checkAll(options.allPermissions);
    } else {
      hasAccess = true;
    }

    if (!hasAccess) {
      if (options?.redirectTo) {
        window.location.href = options.redirectTo;
        return null;
      }

      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            bgcolor: "background.body",
            p: 2,
          }}
        >
          <Alert
            color="danger"
            variant="outlined"
            sx={{
              borderRadius: "8px",
              maxWidth: "500px",
            }}
          >
            <Typography level="h4" sx={{ mb: 1 }}>
              Không có quyền truy cập
            </Typography>
            <Typography level="body-sm">
              Bạn không có quyền để truy cập trang này. Vui lòng liên hệ với quản trị viên hệ thống.
            </Typography>
          </Alert>
        </Box>
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Hook to conditionally render parts of UI
 * Usage:
 * const { isVisible } = useConditionalRender("system:user:delete");
 * {isVisible && <DeleteButton />}
 */
export const useConditionalRender = (
  permission?: PermissionType | string,
  anyPermission?: (PermissionType | string)[],
  allPermissions?: (PermissionType | string)[]
) => {
  const { hasPermission: checkPermission, hasAnyPermission: checkAny, hasAllPermissions: checkAll } = usePermissions();

  let isVisible = false;

  if (permission) {
    isVisible = checkPermission(permission);
  } else if (anyPermission) {
    isVisible = checkAny(anyPermission);
  } else if (allPermissions) {
    isVisible = checkAll(allPermissions);
  } else {
    isVisible = true;
  }

  return { isVisible };
};
