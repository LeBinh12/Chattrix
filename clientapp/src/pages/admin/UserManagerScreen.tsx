import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Input,
  Select,
  Option,
  Breadcrumbs,
  Link,
  Table,
  Checkbox,
  Chip,
  Avatar,
  Sheet,
  IconButton,
  Stack,
  CircularProgress,
} from "@mui/joy";
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Upload,
  RefreshCw,
} from "lucide-react";
import { userAdminApi } from "../../api/admin/userAdminApi";
import type { UserStatus } from "../../types/admin/user";
import { toast } from "react-toastify";
import { API_ENDPOINTS } from "../../config/api";

export default function UserManagerScreen() {
  const [users, setUsers] = useState<UserStatus[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageSize = 10;

  // ========== FETCH DATA FROM API ==========
  const fetchUsers = useCallback(async (page: number) => {
    try {
      setIsLoading(true);
      const response = await userAdminApi.getPagination(page, pageSize);
      console.log("res", response);
      if (response.status === 200 && response.data) {
        setUsers(response.data.users);
        setTotalPages(Math.ceil(response.data.total / pageSize));
        setTotalUsers(response.data.total);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Không thể tải danh sách người dùng!");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ========== INITIAL LOAD ==========
  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, fetchUsers]);

  // ========== REFRESH DATA ==========
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers(currentPage);
    setIsRefreshing(false);
    toast.success("Đã làm mới dữ liệu!");
  };

  // ========== CLIENT-SIDE FILTERING ==========
  const filteredData = users.filter((userStatus) => {
    const { user, status } = userStatus;

    const matchesSearch =
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // ========== SELECTION HANDLERS ==========
  const handleSelectAll = (checked: boolean) => {
    setSelectedUsers(checked ? filteredData.map((u) => u.user.id) : []);
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUsers((prev) =>
      checked ? [...prev, userId] : prev.filter((id) => id !== userId)
    );
  };

  const isAllSelected =
    filteredData.length > 0 &&
    filteredData.every((userStatus) =>
      selectedUsers.includes(userStatus.user.id)
    );

  // ========== STATUS STYLING ==========
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "online":
        return "success";
      case "inactive":
      case "offline":
        return "neutral";
      case "banned":
      case "suspended":
        return "danger";
      default:
        return "neutral";
    }
  };

  // ========== GET USER INITIAL ==========
  const getUserInitial = (user: UserStatus["user"]) => {
    if (user.display_name) {
      return user.display_name.charAt(0).toUpperCase();
    }
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "U";
  };

  // ========== FORMAT DATE ==========
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ========== EXPORT HANDLER ==========
  const handleExport = () => {
    const selectedData = users.filter((u) => selectedUsers.includes(u.user.id));
    console.log("Exporting users:", selectedData);
    toast.success(`Đang xuất ${selectedUsers.length} người dùng...`);
    // TODO: Implement actual export logic
  };

  // ========== DELETE HANDLER ==========
  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc muốn xóa ${selectedUsers.length} người dùng?`)) {
      return;
    }

    try {
      // TODO: Call delete API
      console.log("Deleting users:", selectedUsers);
      toast.success(`Đã xóa ${selectedUsers.length} người dùng!`);
      setSelectedUsers([]);
      await fetchUsers(currentPage);
    } catch {
      toast.error("Không thể xóa người dùng!");
    }
  };

  // ========== DOWNLOAD PDF ==========
  const handleDownloadPDF = () => {
    toast.info("Đang tạo file PDF...");
    // TODO: Implement PDF download
  };

  return (
    <Box
      sx={{ flex: 1, p: 4, bgcolor: "background.level1", minHeight: "100vh" }}
    >
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="neutral" href="/admin">
          Dashboard
        </Link>
        <Typography>Quản lý người dùng</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography level="h2" fontWeight="bold">
            Quản lý người dùng
          </Typography>
          <Typography level="body-sm" textColor="text.tertiary">
            Tổng số: {totalUsers} người dùng
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <IconButton
            variant="outlined"
            color="neutral"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              size={18}
              className={isRefreshing ? "animate-spin" : ""}
            />
          </IconButton>
          <Button
            startDecorator={<Download size={18} />}
            color="primary"
            onClick={handleDownloadPDF}
          >
            Download PDF
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Input
          placeholder="Tìm kiếm theo tên, email, username..."
          startDecorator={<Search size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: "250px" }}
        />

        <Select
          value={statusFilter}
          onChange={(_, value) => setStatusFilter(value as string)}
          sx={{ minWidth: "180px" }}
        >
          <Option value="all">Tất cả trạng thái</Option>
          <Option value="active">Đang hoạt động</Option>
          <Option value="inactive">Không hoạt động</Option>
          <Option value="banned">Đã khóa</Option>
        </Select>
      </Box>

      {/* Action Buttons */}
      {selectedUsers.length > 0 && (
        <Sheet
          variant="soft"
          color="primary"
          sx={{
            p: 2,
            mb: 2,
            borderRadius: "sm",
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography level="body-sm" fontWeight="md">
            Đã chọn {selectedUsers.length} người dùng
          </Typography>
          <Button
            size="sm"
            variant="outlined"
            color="primary"
            startDecorator={<Upload size={16} />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            size="sm"
            variant="outlined"
            color="danger"
            startDecorator={<Trash2 size={16} />}
            onClick={handleDelete}
          >
            Xóa
          </Button>
        </Sheet>
      )}

      {/* Table */}
      <Sheet
        variant="outlined"
        sx={{
          borderRadius: "sm",
          overflow: "hidden",
          bgcolor: "background.surface",
        }}
      >
        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 8,
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Table
            hoverRow
            sx={{
              "& thead th": {
                bgcolor: "background.level1",
                fontWeight: "600",
                fontSize: "xs",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              },
              "& tbody td": {
                py: 2,
              },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: 48, textAlign: "center" }}>
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={selectedUsers.length > 0 && !isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Người dùng</th>
                <th>Email / Phone</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th>Tin nhắn</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((userStatus) => {
                const { user, status, messages_count } = userStatus;

                return (
                  <tr key={user.id}>
                    <td style={{ textAlign: "center" }}>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) =>
                          handleSelectUser(user.id, e.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Avatar
                          size="sm"
                          src={`${API_ENDPOINTS.UPLOAD_MEDIA}/${user.avatar}`}
                          sx={{ bgcolor: "primary.500" }}
                        >
                          {getUserInitial(user)}
                        </Avatar>
                        <Box>
                          <Typography level="body-sm" fontWeight="md">
                            {user.display_name || user.username}
                          </Typography>
                          <Typography level="body-xs" textColor="text.tertiary">
                            @{user.username}
                          </Typography>
                        </Box>
                      </Box>
                    </td>
                    <td>
                      <Typography level="body-sm" textColor="text.secondary">
                        {user.email}
                      </Typography>
                      {user.phone && (
                        <Typography level="body-xs" textColor="text.tertiary">
                          {user.phone}
                        </Typography>
                      )}
                    </td>
                    <td>
                      <Typography level="body-sm" textColor="text.secondary">
                        {formatDate(user.created_at)}
                      </Typography>
                    </td>
                    <td>
                      <Chip
                        variant="soft"
                        size="sm"
                        color={getStatusColor(status)}
                      >
                        {status}
                      </Chip>
                    </td>
                    <td>
                      <Typography level="body-sm" fontWeight="md">
                        {messages_count.toLocaleString()}
                      </Typography>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}

        {/* Empty State */}
        {!isLoading && filteredData.length === 0 && (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Search
              size={48}
              style={{ color: "var(--joy-palette-neutral-400)" }}
            />
            <Typography level="body-md" fontWeight="md" textColor="neutral.500">
              Không tìm thấy người dùng
            </Typography>
            <Typography level="body-sm" textColor="neutral.400">
              {searchQuery || statusFilter !== "all"
                ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                : "Chưa có người dùng nào trong hệ thống"}
            </Typography>
          </Box>
        )}
      </Sheet>

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
            mt: 3,
          }}
        >
          <Button
            variant="outlined"
            color="neutral"
            size="sm"
            startDecorator={<ChevronLeft size={16} />}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>

          <Stack direction="row" spacing={0.5}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={i}
                  variant={currentPage === pageNum ? "solid" : "outlined"}
                  color={currentPage === pageNum ? "primary" : "neutral"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  sx={{ minWidth: 40 }}
                >
                  {pageNum}
                </Button>
              );
            })}
          </Stack>

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <>
              <Typography level="body-sm" textColor="neutral.400">
                ...
              </Typography>
              <Button
                variant="outlined"
                color="neutral"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                sx={{ minWidth: 40 }}
              >
                {totalPages}
              </Button>
            </>
          )}

          <Button
            variant="outlined"
            color="neutral"
            size="sm"
            endDecorator={<ChevronRight size={16} />}
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
          >
            Next
          </Button>
        </Box>
      )}

      {/* Footer Info */}
      <Box sx={{ mt: 2, textAlign: "center" }}>
        <Typography level="body-sm" textColor="text.tertiary">
          Trang {currentPage} / {totalPages} - Hiển thị {filteredData.length}{" "}
          trong tổng số {totalUsers} người dùng
        </Typography>
      </Box>

      {/* Floating Add Button
      <IconButton
        color="primary"
        size="lg"
        variant="solid"
        onClick={() => alert("Thêm người dùng mới")}
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
          borderRadius: "50%",
          width: 56,
          height: 56,
          boxShadow: "lg",
          "&:hover": {
            transform: "scale(1.05)",
            boxShadow: "xl",
          },
          transition: "all 0.2s",
        }}
      >
        <Plus size={24} />
      </IconButton> */}
    </Box>
  );
}
