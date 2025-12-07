// src/components/admin/group/GroupMembersTable.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Sheet,
  Table,
  Typography,
  Chip,
  Avatar,
  CircularProgress,
  Button,
  Stack,
} from "@mui/joy";
import { ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { groupAdminApi } from "../../../api/admin/groupAdminApi";
import type { UserInfoInGroup } from "../../../types/admin/groupNumber";
import { toast } from "react-toastify";

interface GroupMembersTableProps {
  groupId: string;
}

export default function GroupMembersTable({ groupId }: GroupMembersTableProps) {
  const [members, setMembers] = useState<UserInfoInGroup[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const pageSize = 10;

  const fetchMembers = useCallback(
    async (page: number) => {
      if (!groupId) return;
      setIsLoading(true);
      try {
        const res = await groupAdminApi.getNumber(groupId, page, pageSize);
        if (res.status === 200 && res.data) {
          setMembers(res.data.data);
          setTotalMembers(res.data.total);
          setTotalPages(res.data.totalPages || 1);
        }
      } catch (error) {
        toast.error("Không thể tải danh sách thành viên nhóm!");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [groupId]
  );

  useEffect(() => {
    fetchMembers(currentPage);
  }, [currentPage, fetchMembers]);

  // Format ngày
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Màu vai trò
  const getRoleColor = (
    role: string
  ): "danger" | "warning" | "neutral" | "primary" => {
    switch (role.toLowerCase()) {
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

  // Màu trạng thái
  const getStatusColor = (
    status: string
  ): "success" | "warning" | "danger" | "neutral" => {
    switch (status.toLowerCase()) {
      case "active":
        return "success";
      case "muted":
        return "warning";
      case "banned":
        return "danger";
      default:
        return "neutral";
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        overflow: "auto",
        mt: 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography level="title-md" fontWeight="bold">
          Danh sách thành viên ({totalMembers})
        </Typography>
        <Button
          size="sm"
          startDecorator={<UserPlus size={16} />}
          variant="outlined"
        >
          Thêm thành viên
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : members.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6, color: "text.tertiary" }}>
          <Typography>Chưa có thành viên nào trong nhóm này</Typography>
        </Box>
      ) : (
        <>
          <Sheet
            variant="outlined"
            sx={{ borderRadius: "sm", flex: 1, overflow: "hidden" }}
          >
            <Table size="sm" hoverRow>
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Tham gia</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Avatar
                          size="sm"
                          src={member.avatar || undefined}
                          sx={{ bgcolor: "primary.500" }}
                        >
                          {member.display_name?.charAt(0).toUpperCase() || "U"}
                        </Avatar>
                        <Box>
                          <Typography level="body-sm" fontWeight="md">
                            {member.display_name}
                          </Typography>
                          <Typography level="body-xs" textColor="text.tertiary">
                            {member.email}
                          </Typography>
                        </Box>
                      </Box>
                    </td>
                    <td>
                      <Chip
                        variant="soft"
                        size="sm"
                        color={getRoleColor(member.role)}
                      >
                        {member.role}
                      </Chip>
                    </td>
                    <td>
                      <Chip
                        variant="soft"
                        size="sm"
                        color={getStatusColor(member.status)}
                      >
                        {member.status}
                      </Chip>
                    </td>
                    <td>
                      <Typography level="body-xs" textColor="text.tertiary">
                        {formatDate(member.joined_at)}
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Sheet>

          {/* Pagination riêng cho thành viên */}
          {totalPages > 1 && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 2, justifyContent: "center", alignItems: "center" }}
            >
              <Button
                size="sm"
                variant="outlined"
                color="neutral"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                startDecorator={<ChevronLeft size={16} />}
              >
                Trước
              </Button>

              <Typography level="body-sm">
                Trang {currentPage} / {totalPages}
              </Typography>

              <Button
                size="sm"
                variant="outlined"
                color="neutral"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                endDecorator={<ChevronRight size={16} />}
              >
                Sau
              </Button>
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
