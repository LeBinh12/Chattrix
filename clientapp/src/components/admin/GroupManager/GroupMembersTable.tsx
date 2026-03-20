import { groupAdminApi } from "../../../api/admin/groupAdminApi";
import type { UserInfoInGroup } from "../../../types/admin/groupNumber";
import { toast } from "react-toastify";
import React, { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/joy";
import GroupMembersDataTable from "./GroupMembersDataTable";

interface GroupMembersTableProps {
  groupId: string;
  totalMembers?: number;
}

export default function GroupMembersTable({ groupId }: GroupMembersTableProps) {
  const [members, setMembers] = useState<UserInfoInGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMembers = useCallback(
    async () => {
      if (!groupId) return;
      setIsLoading(true);

      try {
        // Gọi API lấy TOÀN BỘ dữ liệu - client-side pagination
        const res = await groupAdminApi.getNumber(groupId, 1, 9999);

        if (res.status === 200 && res.data) {
          const membersData = res.data.data || [];
          setMembers(membersData);
        }
      } catch (error: any) {
        console.error('❌ GroupMembersTable - API Error:', error);
        if (error.response?.status !== 403) {
          toast.error("Không thể tải danh sách thành viên nhóm!");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [groupId]
  );

  useEffect(() => {
    fetchMembers(); // Gọi API 1 lần lúc mount
  }, [fetchMembers]);


  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Header with total count */}
      <Box sx={{ mb: 1.5 }}>
        <Typography level="title-md" fontWeight="bold" sx={{ color: "#41301B", fontSize: "14px" }}>
          Danh sách thành viên
        </Typography>
        <Typography level="body-xs" sx={{ color: "#6b7280", fontSize: "13px", mt: 0.5 }}>
          Tổng cộng: <b>{members.length}</b> thành viên
        </Typography>
      </Box>

      {/* GroupMembersDataTable - Custom table không dùng AG Grid */}
      <GroupMembersDataTable members={members} isLoading={isLoading} />
    </Box>
  );
}
