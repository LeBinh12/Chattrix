import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Chip, Box, Typography, Checkbox, List, ListItem } from "@mui/joy";
import type { RoleInfo } from "../../../types/admin/user";
import { roleAdminApi } from "../../../api/admin/roleAdminApi";
import type { Role } from "../../../types/admin/role";

interface UserRoleCellProps {
  roles?: RoleInfo[];
}

/**
 * Get role color based on role name/code
 */
const getRoleColor = (roleName: string): string => {
  const lowerName = roleName?.toLowerCase() || "";
  
  if (lowerName.includes("admin") || lowerName.includes("quản trị")) return "#ef4444";
  if (lowerName.includes("giám") || lowerName.includes("director")) return "#f59e0b";
  if (lowerName.includes("lãnh đạo") || lowerName.includes("leader")) return "#10b981";
  if (lowerName.includes("giảng viên") || lowerName.includes("teacher")) return "#f97316";
  if (lowerName.includes("bác sĩ") || lowerName.includes("doctor")) return "#10b981";
  if (lowerName.includes("trợ tá") || lowerName.includes("assistant")) return "#8b5cf6";
  if (lowerName.includes("lễ tân") || lowerName.includes("reception")) return "#ec4899";
  if (lowerName.includes("cán bộ") || lowerName.includes("staff")) return "#3b82f6";
  if (lowerName.includes("nhóm") || lowerName.includes("group")) return "#6b7280";
  if (lowerName.includes("người dùng") || lowerName.includes("user")) return "#0ea5e9";
  return "#6b7280";
};

/**
 * UserRoleCell - Displays user roles with popover for full list
 * 
 * HÀNH VI POP-UP ROLE (QUAN TRỌNG):
 * - Chỉ hiển thị POP-UP dạng dropdown/popover (KHÔNG PHẢI modal có backdrop)
 * - Hiển thị FULL danh sách role trong hệ thống
 * - Checkbox CHỈ ĐỂ HIỂN THỊ, KHÔNG cho click
 */
const UserRoleCell: React.FC<UserRoleCellProps> = ({ roles = [] }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 400 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Đảm bảo roles luôn là array (xử lý null/undefined từ API)
  const safeRoles = Array.isArray(roles) ? roles : [];

  // Show only primary role as chip; collapse the rest into a "+N" chip
  const displayedRoles = safeRoles.slice(0, 1);
  const remainingCount = safeRoles.length > 1 ? safeRoles.length - 1 : 0;
  const userRoleIds = new Set(safeRoles.map((r) => r.id));

  // Fetch all system roles when popover opens
  const fetchAllRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await roleAdminApi.getList(1, 100);
      if (response.data?.items) {
        setAllRoles(response.data.items);
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Calculate popover position
  const getPopoverPosition = () => {
    if (!anchorRef.current) {
      return { top: 0, left: 0, maxHeight: 400 };
    }
    const rect = anchorRef.current.getBoundingClientRect();
    
    // Ensure position is always visible (not negative or off-screen)
    let top = rect.bottom + 8; // Add more space below chip
    let left = rect.left;
    
    // If too close to top (chip near top of viewport), position below
    if (top < 0) {
      top = rect.top + rect.height + 8;
    }
    
    // If still negative (chip above viewport), use absolute minimum
    if (top < 10) {
      top = 10;
    }
    
    // Ensure not too far right
    const popoverWidth = 320;
    if (left + popoverWidth > window.innerWidth) {
      left = window.innerWidth - popoverWidth - 16;
    }
    
    // Ensure minimum left margin
    if (left < 10) {
      left = 10;
    }
    
    // Calculate available height from popover position to bottom of viewport
    // Reserve 16px margin from bottom
    const availableHeight = window.innerHeight - top - 16;
    
    // Minimum height for popover header + at least 2 items
    const minHeight = 120;
    const maxHeight = Math.max(minHeight, Math.min(availableHeight, 400));
    
    return { top, left, maxHeight };
  };

  // Update position when popover opens
  useEffect(() => {
    if (popoverOpen) {
      const newPos = getPopoverPosition();
      setPosition(newPos);
      if (allRoles.length === 0) {
        fetchAllRoles();
      }
    }
  }, [popoverOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };

    if (popoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [popoverOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && popoverOpen) {
        setPopoverOpen(false);
      }
    };

    if (popoverOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [popoverOpen]);

  // Handle keyboard navigation on chip
  const handleChipKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setPopoverOpen(!popoverOpen);
    }
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
        {displayedRoles.map((role) => (
          <Chip
            key={role.id}
            size="sm"
            variant="soft"
            sx={{
              backgroundColor: `${getRoleColor(role.name)}15`,
              color: getRoleColor(role.name),
              fontWeight: 500,
            }}
          >
            {role.name}
          </Chip>
        ))}

        {remainingCount > 0 && (
          <Box ref={anchorRef}>
            <Chip
              size="sm"
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                setPopoverOpen(!popoverOpen);
              }}
              onKeyDown={handleChipKeyDown}
              tabIndex={0}
              role="button"
              aria-haspopup="listbox"
              aria-expanded={popoverOpen}
              sx={{
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: "#f3f4f6",
                },
                "&:focus": {
                  outline: "2px solid #3b82f6",
                  outlineOffset: "2px",
                },
              }}
            >
              +{remainingCount}
            </Chip>
          </Box>
        )}
      </Box>

      {/* Popover - Read-only role list - RENDER VIA PORTAL */}
      {popoverOpen && createPortal(
        <Box
          ref={popoverRef}
          role="listbox"
          aria-label="Danh sách vai trò"
          onClick={(e) => {
            e.stopPropagation();
          }}
          sx={{
            position: "fixed",
            top: `${position.top}px`,
            left: `${position.left}px`,
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.3)",
            minWidth: "280px",
            maxWidth: "320px",
            maxHeight: `${position.maxHeight}px`,
            overflow: "hidden",
            border: "2px solid #3b82f6",
            zIndex: 999999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
              flexShrink: 0,
            }}
          >
            <Typography level="title-sm" fontWeight="600">
              Tất cả vai trò trong hệ thống
            </Typography>
            <Typography level="body-xs" sx={{ color: "#6b7280", mt: 0.5 }}>
              ✓ = Vai trò của người dùng này
            </Typography>
          </Box>

          {/* Role List */}
          <List
            sx={{
              py: 0,
              flex: 1,
              overflowY: "auto",
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#d1d5db",
                borderRadius: "3px",
              },
            }}
          >
            {loadingRoles ? (
              <ListItem sx={{ justifyContent: "center", py: 3 }}>
                <Typography level="body-sm" sx={{ color: "#6b7280" }}>
                  Đang tải...
                </Typography>
              </ListItem>
            ) : allRoles.length === 0 ? (
              <ListItem sx={{ justifyContent: "center", py: 3 }}>
                <Typography level="body-sm" sx={{ color: "#6b7280" }}>
                  Không có dữ liệu
                </Typography>
              </ListItem>
            ) : (
              allRoles.map((role) => {
                const isUserRole = userRoleIds.has(role.id);
                return (
                  <ListItem
                    key={role.id}
                    role="option"
                    aria-selected={isUserRole}
                    sx={{
                      py: 1.5,
                      px: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      borderBottom: "1px solid #f3f4f6",
                      "&:last-child": {
                        borderBottom: "none",
                      },
                      "&:hover": {
                        backgroundColor: "#f9fafb",
                      },
                    }}
                  >
                    {/* Color dot */}
                    <Box
                      sx={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: getRoleColor(role.name),
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />

                    {/* Role name */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        level="body-sm"
                        fontWeight={isUserRole ? "600" : "400"}
                        sx={{
                          color: isUserRole ? "#111827" : "#4b5563",
                        }}
                        title={role.name}
                      >
                        {role.name}
                      </Typography>
                      {role.description && (
                        <Typography
                          level="body-xs"
                          sx={{
                            color: "#9ca3af",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={role.description}
                        >
                          {role.description}
                        </Typography>
                      )}
                    </Box>

                    {/* Read-only checkbox */}
                    <Checkbox
                      checked={isUserRole}
                      disabled
                      size="sm"
                      aria-checked={isUserRole}
                      aria-disabled="true"
                      sx={{
                        pointerEvents: "none",
                        opacity: isUserRole ? 1 : 0.4,
                      }}
                    />
                  </ListItem>
                );
              })
            )}  
          </List>
        </Box>,
        document.body
      )}
    </Box>
  );
};

export default UserRoleCell;
