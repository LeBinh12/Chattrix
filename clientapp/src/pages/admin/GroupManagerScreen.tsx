// src/components/admin/group/GroupManagerScreen.tsx
import { useState, useEffect, useCallback } from "react";
import { Box, Breadcrumbs, Link, Typography, CircularProgress } from "@mui/joy";
import { toast } from "react-toastify";
import type { GroupDetail } from "../../types/admin/group";
import { groupAdminApi } from "../../api/admin/groupAdminApi";
import GroupSearchAndActions from "../../components/admin/GroupManager/GroupSearchAndActions";
import GroupListTable from "../../components/admin/GroupManager/GroupListTable";
import GroupPagination from "../../components/admin/GroupManager/GroupPagination";
import GroupDetailModal from "../../components/admin/GroupManager/GroupDetailModal";

export default function GroupManagerScreen() {
  const [groups, setGroups] = useState<GroupDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const pageSize = 10;

  const fetchGroups = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const res = await groupAdminApi.getPagination(page, pageSize);
      if (res.status === 200 && res.data) {
        setGroups(res.data.data);
        setTotalPages(res.data.totalPages);
        setTotalGroups(res.data.total);
      }
    } catch {
      toast.error("Không thể tải danh sách nhóm!");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups(currentPage);
  }, [currentPage, fetchGroups]);

  const handleViewGroup = (group: GroupDetail) => {
    setSelectedGroup(group);
    setShowDetail(true);
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box
      sx={{ flex: 1, p: 4, bgcolor: "background.level1", minHeight: "100vh" }}
    >
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="neutral" href="#">
          Dashboard
        </Link>
        <Typography>Quản lý nhóm</Typography>
      </Breadcrumbs>

      <GroupSearchAndActions
        totalGroups={totalGroups}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isRefreshing={isLoading}
        onRefresh={() => fetchGroups(currentPage)}
      />

      {isLoading && groups.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <GroupListTable
            groups={filteredGroups}
            onViewGroup={handleViewGroup}
          />
          <GroupPagination
            currentPage={currentPage}
            totalPages={totalPages}
            setPage={setCurrentPage}
          />
        </>
      )}

      <GroupDetailModal
        open={showDetail}
        group={selectedGroup}
        onClose={() => setShowDetail(false)}
      />
    </Box>
  );
}
