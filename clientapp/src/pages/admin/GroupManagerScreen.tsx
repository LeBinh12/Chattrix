// src/pages/admin/GroupManagerScreen.tsx
import { useState, useEffect, useCallback } from "react";
import { Box, IconButton, Typography } from "@mui/joy";
import { Eye, ChevronRight, Users, MessageSquare } from "lucide-react";
import { toast } from "react-toastify";
import { Input } from "@mui/joy";

import type { GroupDetail } from "../../types/admin/group";
import type { DataTableColumn } from "../../components/admin/DataTable";
import DataTable from "../../components/admin/DataTable";
import DataManagementLayout from "../../components/admin/DataManagementLayout";
import GroupDetailModal from "../../components/admin/GroupManager/GroupDetailModal";
import UserAvatar from "../../components/UserAvatar";
import { groupAdminApi } from "../../api/admin/groupAdminApi";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/menuPermissions";
import { API_ENDPOINTS } from "../../config/api";

export default function GroupManagerScreen() {
  const { hasPermission } = usePermissions();

  // ========== FILTERS & SEARCH ==========
  const [searchQuery, setSearchQuery] = useState("");
  const [minMembers, setMinMembers] = useState<number | "">("");
  const [maxMembers, setMaxMembers] = useState<number | "">("");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // ========== DATA STATE ==========
  const [groups, setGroups] = useState<GroupDetail[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // ========== DETAIL MODAL ==========
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // ========== FETCH ==========
  const fetchGroups = useCallback(async () => {
    try {
      const res = await groupAdminApi.getPagination(
        currentPage,
        pageSize,
        searchQuery,
        Number(minMembers) || 0,
        Number(maxMembers) || 0
      );
      if (res.status === 200 && res.data) {
        setGroups(res.data.data);
        setTotalGroups(res.data.total);
      }
    } catch (error: any) {
      if (error.response?.status !== 403) {
        toast.error("Không thể tải danh sách nhóm!");
      }
    }
  }, [currentPage, pageSize, searchQuery, minMembers, maxMembers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, minMembers, maxMembers]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleViewGroup = (group: GroupDetail) => {
    setSelectedGroup(group);
    setShowDetail(true);
  };

  // ========== AVATAR HELPER ==========
  const resolveAvatar = (image: string | null): string | undefined => {
    if (!image || image === "null" || image === "undefined") return undefined;
    if (image.startsWith("http")) return image;
    return `${API_ENDPOINTS.UPLOAD_MEDIA}/${image}`;
  };

  // ========== COLUMN DEFINITIONS ==========
  const columns: DataTableColumn<GroupDetail>[] = [
    {
      key: "name",
      header: "NHÓM",
      flexGrow: 1,
      sortable: true,
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10, height: "100%" }}>
          <UserAvatar
            avatar={resolveAvatar(row.image)}
            display_name={row.name}
            showOnlineStatus={false}
            size={32}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", lineHeight: 1.3 }}>
              {row.name}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              ID: {row.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "members_count",
      header: "THÀNH VIÊN",
      width: 130,
      align: "center",
      sortable: true,
      dataKey: "members_count",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Users size={15} color="#00568c" />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
            {row.members_count}
          </span>
        </div>
      ),
    },
    {
      key: "messages_count",
      header: "TIN NHẮN",
      width: 120,
      align: "center",
      sortable: true,
      dataKey: "messages_count",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <MessageSquare size={15} color="#6b7280" />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
            {row.messages_count}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "THAO TÁC",
      width: 100,
      align: "center",
      sortable: false,
      fixed: "right",
      headerClassName: "no-bg-header",
      render: (row) => {
        if (!hasPermission(PERMISSIONS.GROUP_VIEW_DETAILS)) return null;
        return (
          <Box
            sx={{ display: "flex", justifyContent: "center", width: "100%" }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              size="sm"
              variant="soft"
              color="primary"
              onClick={() => handleViewGroup(row)}
              title="Xem chi tiết"
              sx={{ borderRadius: "6px" }}
            >
              <Eye size={16} />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  // ========== ADVANCED SEARCH DRAWER CONTENT ==========
  const advancedSearchContent = (
    <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography level="body-xs" sx={{ mb: 1, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Số thành viên tối thiểu
        </Typography>
        <Input
          type="number"
          placeholder="VD: 5"
          value={minMembers}
          onChange={(e) => setMinMembers(e.target.value === "" ? "" : Number(e.target.value))}
          size="sm"
          slotProps={{ input: { min: 0 } }}
          sx={{ width: "100%" }}
        />
      </Box>

      <Box>
        <Typography level="body-xs" sx={{ mb: 1, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Số thành viên tối đa
        </Typography>
        <Input
          type="number"
          placeholder="VD: 100"
          value={maxMembers}
          onChange={(e) => setMaxMembers(e.target.value === "" ? "" : Number(e.target.value))}
          size="sm"
          slotProps={{ input: { min: 0 } }}
          sx={{ width: "100%" }}
        />
      </Box>
    </Box>
  );

  // ========== DESKTOP INLINE FILTER CONTROLS ==========
  const filterControls = (
    <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1, alignItems: "center" }}>
      <input
        type="number"
        min={0}
        placeholder="Thành viên tối thiểu"
        value={minMembers}
        onChange={(e) => setMinMembers(e.target.value === "" ? "" : Number(e.target.value))}
        className="h-[36px] px-3 border border-[#e5e5ea] rounded-md text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#00568c] focus:ring-1 focus:ring-[#00568c] transition-all bg-white"
        style={{ width: 190 }}
      />
      <input
        type="number"
        min={0}
        placeholder="Thành viên tối đa"
        value={maxMembers}
        onChange={(e) => setMaxMembers(e.target.value === "" ? "" : Number(e.target.value))}
        className="h-[36px] px-3 border border-[#e5e5ea] rounded-md text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#00568c] focus:ring-1 focus:ring-[#00568c] transition-all bg-white"
        style={{ width: 190 }}
      />
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh", bgcolor: "#F3F4F6", overflow: "hidden" }}>
      {/* Breadcrumb Header */}
      <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1, bgcolor: "white", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
        <Typography level="body-sm" sx={{ color: "text.secondary" }}>Quản lý</Typography>
        <ChevronRight size={14} className="text-gray-400" />
        <Typography level="body-sm" sx={{ fontWeight: 600, color: "text.primary" }}>Nhóm</Typography>
        <Typography level="body-sm" sx={{ color: "text.tertiary", ml: "auto" }}>
          {totalGroups > 0 ? `${totalGroups} nhóm` : ""}
        </Typography>
      </Box>

      <DataManagementLayout
        searchTerm={searchQuery}
        onSearchTermChange={setSearchQuery}
        onSearch={fetchGroups}
        searchPlaceholder="Tìm kiếm tên nhóm..."
        advancedOpen={isFilterDrawerOpen}
        onToggleAdvanced={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
        advancedContent={advancedSearchContent}
        advancedButtonLabels={{ open: "Bộ lọc tìm kiếm", close: "Thu gọn" }}
        filterControls={filterControls}
        advancedActions={
          <button
            onClick={() => {
              fetchGroups();
              setIsFilterDrawerOpen(false);
            }}
            style={{
              width: "100%",
              height: 40,
              background: "#00568c",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Áp dụng bộ lọc
          </button>
        }
      >
        <DataTable
          data={groups}
          columns={columns}
          total={totalGroups}
          rowKey="id"
          serverSidePagination={true}
          enableNativePagination={false}
          limitOptions={[15, 30, 50, 100]}
          limit={pageSize}
          currentPage={currentPage}
          onChangePage={setCurrentPage}
          onChangeLimit={setPageSize}
          autoFitHeight
          autoFitBottomGap={0}
        />
      </DataManagementLayout>

      {/* Group Detail Modal */}
      <GroupDetailModal
        open={showDetail}
        group={selectedGroup}
        onClose={() => setShowDetail(false)}
      />
    </Box>
  );
}
