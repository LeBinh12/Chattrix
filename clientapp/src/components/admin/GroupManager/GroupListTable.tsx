// src/components/admin/group/GroupListTable.tsx
import { useState, useEffect } from "react";
import { Box, IconButton } from "@mui/joy";
import { Users, Eye } from "lucide-react";
import type { GroupDetail } from "../../../types/admin/group";
import { groupAdminApi } from "../../../api/admin/groupAdminApi";
import ModernDataTable, { type ColumnConfig } from "../ModernDataTable";
import { toast } from "react-toastify";
import UserAvatar from "../../UserAvatar";
import { PERMISSIONS } from "../../../constants/menuPermissions";
import { usePermissions } from "../../../hooks/usePermissions";

interface Props {
  onViewGroup: (group: GroupDetail) => void;
  searchQuery?: string;
  minMembers?: number | "";
  maxMembers?: number | "";
  onTotalChange?: (total: number) => void;
}

export default function GroupListTable({ 
  onViewGroup, 
  searchQuery, 
  minMembers, 
  maxMembers,
  onTotalChange 
}: Props) {
  const { hasPermission } = usePermissions();
  const [groups, setGroups] = useState<GroupDetail[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize, setPageSize] = useState(15);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Fetch groups data
  const fetchGroups = async () => {
    setIsLoading(true);
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
        onTotalChange?.(res.data.total);
      }
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      if (error.response?.status !== 403) {
        toast.error("Không thể tải danh sách nhóm!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, minMembers, maxMembers]);

  useEffect(() => {
    fetchGroups();
  }, [currentPage, pageSize, searchQuery, minMembers, maxMembers]);

  // Column definitions
  const columns: ColumnConfig[] = [
    {
      key: "name",
      label: "NHÓM",
      flexGrow: 1,
      cellRenderer: (rowData: GroupDetail) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <UserAvatar
            avatar={rowData.image}
            display_name={rowData.name}
            showOnlineStatus={false}
            size={35}
          />  
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>
              {rowData.name}
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>
              ID: {rowData.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "members_count",
      label: "THÀNH VIÊN",
      width: 130,
      align: "center",
      cellRenderer: (rowData: GroupDetail) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <Users size={16} color="#B88A4C" />
          <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>
            {rowData.members_count}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "THAO TÁC",
      width: 140,
      align: "center",
      sortable: false,
      cellRenderer: (rowData: GroupDetail) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          {hasPermission(PERMISSIONS.GROUP_VIEW_DETAILS) && (
            <IconButton
              size="sm"
              variant="soft"
              sx={{
                color: "#B88A4C",
                bgcolor: "#F8F3ED",
                "&:hover": { bgcolor: "#EADBC8", color: "#41301B" },
                borderRadius: "4px",
              }}
              onClick={() => onViewGroup(rowData)}
            >
              <Eye size={16} />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
      }}
    >
      <ModernDataTable
        data={groups}
        columns={columns}
        loading={isLoading}
        height={600}
        page={currentPage}
        limit={pageSize}
        total={totalGroups}
        onPageChange={setCurrentPage}
        onLimitChange={setPageSize}
        selectable
        selectedKeys={selectedGroups}
        onSelectChange={setSelectedGroups}
        rowKey="id"
        emptyMessage="Không tìm thấy nhóm nào"
        serverSidePagination={true}
      />
    </Box>
  );
}
