import React, { useState, useMemo } from "react";
import { Box, Typography, Chip, CircularProgress } from "@mui/joy";
import UserAvatar from "../../UserAvatar";
import type { UserInfoInGroup } from "../../../types/admin/groupNumber";

interface GroupMembersDataTableProps {
  members: UserInfoInGroup[];
  isLoading: boolean;
}

export default function GroupMembersDataTable({ members, isLoading }: GroupMembersDataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Calculate pagination
  const totalPages = Math.ceil(members.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedMembers = useMemo(() => members.slice(startIndex, endIndex), [members, startIndex, endIndex]);

  // Reset to page 1 when members change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [members.length]);
  // Format date - chuẩn DD/MM/YYYY HH:mm (vi-VN)
  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Map status to Vietnamese text
  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      active: "Đang hoạt động",
      inactive: "Ngưng hoạt động",
      pending: "Chờ kích hoạt",
      muted: "Bị tắt tiếng",
      banned: "Bị cấm",
    };
    return statusMap[status?.toLowerCase()] || status || "N/A";
  };

  // Get status color for Chip
  const getStatusColor = (status: string): any => {
    switch (status?.toLowerCase()) {
      case "active":
        return "success";
      case "inactive":
      case "muted":
        return "warning";
      case "pending":
        return "neutral";
      case "banned":
        return "danger";
      default:
        return "neutral";
    }
  };

  // Get role color for Chip
  const getRoleColor = (role: string): any => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "danger";
      case "moderator":
        return "warning";
      case "owner":
        return "primary";
      default:
        return "neutral";
    }
  };

  // Map role code to Vietnamese name
  const getRoleName = (roleCode: string): string => {
    const roleMap: Record<string, string> = {
      admin: "Quản trị viên",
      moderator: "Điều hành viên",
      owner: "Chủ sở hữu",
      member: "Thành viên",
      guest: "Khách",
    };
    return roleMap[roleCode?.toLowerCase()] || roleCode || "N/A";
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
        <CircularProgress size="md" />
      </Box>
    );
  }

  if (members.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography level="body-md" sx={{ color: "#9ca3af" }}>
          Không có thành viên trong nhóm
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        bgcolor: "white",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* Table Content Wrapper - Scrollable horizontally */}
      <Box sx={{ overflowX: "auto" }}>
        {/* Header */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: 2,
            px: 2,
            py: 1.5,
            bgcolor: "#f9fafb",
            borderBottom: "2px solid #e5e7eb",
            minWidth: "700px", // Force scroll on mobile
          }}
        >
          <Typography level="body-sm" fontWeight="600" sx={{ color: "#374151", fontSize: "12px" }}>
            THÀNH VIÊN
          </Typography>
          <Typography level="body-sm" fontWeight="600" sx={{ color: "#374151", fontSize: "12px" }}>
            VAI TRÒ
          </Typography>
         
          <Typography level="body-sm" fontWeight="600" sx={{ color: "#374151", fontSize: "12px" }}>
            THAM GIA
          </Typography>
        </Box>

        {/* Body */}
        <Box sx={{ maxHeight: "400px", overflowY: "auto", minWidth: "700px" }}>
          {paginatedMembers.map((member) => (
            <Box
              key={member.id}
              sx={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: 2,
                px: 2,
                py: 1.5,
                borderBottom: "1px solid #f3f4f6",
                alignItems: "center",
                "&:hover": {
                  bgcolor: "#f9fafb",
                },
              }}
            >
              {/* Member Info */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <UserAvatar
                  avatar={member.avatar}
                  display_name={member.display_name}
                  size={36}
                  showOnlineStatus={false}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    level="body-md"
                    fontWeight="500"
                    sx={{
                      color: "#111827",
                      fontSize: "14px",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {member.display_name}
                  </Typography>
                  <Typography
                    level="body-sm"
                    sx={{
                      color: "#6b7280",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {member.email}
                  </Typography>
                </Box>
              </Box>

              {/* Role */}
              <Box>
                <Chip
                  variant="soft"
                  size="sm"
                  color={getRoleColor(member.role)}
                  sx={{
                    fontSize: "13px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {getRoleName(member.role)}
                </Chip>
              </Box>

          

              {/* Joined Date */}
              <Box>
                <Typography
                  level="body-sm"
                  sx={{
                    color: "#374151",
                    fontSize: "14px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDate(member.joined_at)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Pagination - Responsive */}
      {members.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: { xs: "center", sm: "flex-end" },
            alignItems: "center",
            gap: { xs: 2, sm: 3 },
            px: 2,
            py: 1.5,
            borderTop: "1px solid #e5e7eb",
            bgcolor: "#fafafa",
            minHeight: "56px",
          }}
        >
          {/* Page Size Selector */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography level="body-sm" sx={{ color: "#4b5563", fontSize: "14px", whiteSpace: "nowrap" }}>
              Page Size:
            </Typography>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "white",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {[10, 15, 20, 30, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </Box>

          {/* Navigation & Range */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
            {/* Range Info */}
            <Typography level="body-sm" sx={{ color: "#4b5563", fontSize: "14px", whiteSpace: "nowrap" }}>
              {startIndex + 1} - {Math.min(endIndex, members.length)} of {members.length}
            </Typography>

            {/* Navigation Controls */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  width: "32px",
                  height: "32px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  backgroundColor: currentPage === 1 ? "#f3f4f6" : "white",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
                title="First page"
              >
                «
              </button>

              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  width: "32px",
                  height: "32px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  backgroundColor: currentPage === 1 ? "#f3f4f6" : "white",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
                title="Previous page"
              >
                ‹
              </button>

              <Typography 
                level="body-sm" 
                sx={{ 
                  minWidth: "80px", 
                  textAlign: "center", 
                  color: "#374151", 
                  fontSize: "14px", 
                  fontWeight: 500 
                }}
              >
                 {currentPage} / {totalPages}
              </Typography>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                style={{
                  width: "32px",
                  height: "32px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  backgroundColor: currentPage >= totalPages ? "#f3f4f6" : "white",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
                title="Next page"
              >
                ›
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                style={{
                  width: "32px",
                  height: "32px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  backgroundColor: currentPage >= totalPages ? "#f3f4f6" : "white",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
                title="Last page"
              >
                »
              </button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
