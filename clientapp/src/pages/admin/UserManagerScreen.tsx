import { useState, useEffect } from "react";
import { useRecoilValue } from "recoil";
import { userAtom } from "../../recoil/atoms/userAtom";
import {
  Box,
  Typography,
  Button,
  Input,
  Chip,
  Select,
  Option,
  IconButton,
  Stack,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  ListItemDecorator,
} from "@mui/joy";
import { Drawer, SelectPicker, DatePicker, DateRangePicker } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import {
  Trash2,
  UserPlus,
  Edit,
  KeyRound,
  MoreVertical,
  MoreHorizontal,
} from "lucide-react";
import { userAdminApi } from "../../api/admin/userAdminApi";
import type { UserStatus } from "../../types/admin/user";
import { toast } from "react-toastify";
import RegisterForm from "../../components/admin/RegisterForm";
import UpdateUserModal from "../../components/admin/User/UpdateUserModal";
import UserRoleCell from "../../components/admin/User/UserRoleCell";
import { authApi } from "../../api/authApi";
import ConfirmModal from "../../components/notification/ConfirmModal";
import { PERMISSIONS } from "../../constants/menuPermissions";
import { usePermissions } from "../../hooks/usePermissions";

import { ChevronRight } from "lucide-react";
import DataManagementLayout from "../../components/admin/DataManagementLayout";
import DataTable from "../../components/admin/DataTable";
import type { DataTableColumn } from "../../components/admin/DataTable";
import {
  UserCell,
  DateTimeCell,
} from "../../components/admin/ModernDataTable";

export default function UserManagerScreen() {
  const currentUserResponse = useRecoilValue(userAtom);
  const currentUserId = currentUserResponse?.data?.id || null;
  const { hasPermission } = usePermissions();
  const [users, setUsers] = useState<(UserStatus & { id: string })[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [pageSize, setPageSize] = useState(15);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedUserForUpdate, setSelectedUserForUpdate] = useState<
    UserStatus["user"] | null
  >(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // ========== FETCH DATA ==========
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await userAdminApi.getPagination(
        currentPage,
        pageSize,
        searchQuery,
        genderFilter,
        statusFilter,
        fromDate,
        toDate
      );

      if (response && response.data.users) {
        const usersWithId = response.data.users.map(u => ({
          ...u,
          id: String(u.user.id)
        }));
        setUsers(usersWithId);
        setTotalUsers(response.data.total);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      if (error.response?.status !== 403) {
        toast.error("Không thể tải danh sách người dùng!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ========== DATE HELPER FUNCTIONS ==========
  /**
   * Parse ISO date string (yyyy-MM-dd) to Date object without timezone offset
   */
  const parseIsoDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date in local timezone to avoid UTC offset issues
    return new Date(year, month - 1, day);
  };

  /**
   * Convert Date object to ISO date string (yyyy-MM-dd)
   */
  const dateToIsoString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Handle fromDate change with validation
   */
  const handleFromDateChange = (date: Date | null) => {
    if (!date) {
      setFromDate("");
      return;
    }

    const newFromDate = dateToIsoString(date);
    setFromDate(newFromDate);

    // If toDate is set and less than fromDate, reset toDate
    if (toDate) {
      const fromDateObj = parseIsoDate(newFromDate);
      const toDateObj = parseIsoDate(toDate);
      if (fromDateObj && toDateObj && fromDateObj > toDateObj) {
        setToDate("");
      }
    }
  };

  /**
   * Handle toDate change with validation
   */
  const handleToDateChange = (date: Date | null) => {
    if (!date) {
      setToDate("");
      return;
    }

    const newToDate = dateToIsoString(date);

    // If fromDate is set and greater than toDate, don't allow
    if (fromDate) {
      const fromDateObj = parseIsoDate(fromDate);
      const toDateObj = parseIsoDate(newToDate);
      if (fromDateObj && toDateObj && fromDateObj > toDateObj) {
        toast.warning("Ngày kết thúc phải lớn hơn ngày bắt đầu!");
        return;
      }
    }

    setToDate(newToDate);
  };

  /**
   * Check if date is disabled for fromDate picker
   */
  const isFromDateDisabled = (date: Date): boolean => {
    if (!toDate) return false;
    const toDateObj = parseIsoDate(toDate);
    return toDateObj ? date > toDateObj : false;
  };

  /**
   * Check if date is disabled for toDate picker
   */
  const isToDateDisabled = (date: Date): boolean => {
    if (!fromDate) return false;
    const fromDateObj = parseIsoDate(fromDate);
    return fromDateObj ? date < fromDateObj : false;
  };

  /**
   * Handle date range change
   */
  const handleDateRangeChange = (value: [Date, Date] | null) => {
    if (!value) {
      setFromDate("");
      setToDate("");
      return;
    }
    setFromDate(dateToIsoString(value[0]));
    setToDate(dateToIsoString(value[1]));
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, pageSize, searchQuery, statusFilter, genderFilter, fromDate, toDate]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, genderFilter, fromDate, toDate]);

  // ========== STATUS STYLING ==========
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
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

  // ========== EDIT HANDLER ==========
  const handleEdit = (rowData: UserStatus) => {
    // Gộp roles vào object user để UpdateUserModal có thể nhận và tick sẵn checkbox
    const userWithRoles = { 
      ...rowData.user, 
      roles: rowData.roles 
    };
    setSelectedUserForUpdate(userWithRoles);
    setIsUpdateModalOpen(true);
  };

  // ========== DELETE SINGLE USER ==========
  const handleDeleteSingle = async (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xóa",
      description: "Bạn có chắc muốn xóa người dùng này? Hành động này không thể hoàn tác.",
      onConfirm: async () => {
        try {
          await userAdminApi.deleteUser(userId);
          toast.success(`Đã xóa người dùng thành công!`);
          fetchUsers();
        } catch (error: any) {
          if (error.response?.status !== 403) {
            toast.error("Không thể xóa người dùng!");
          }
        }
      },
    });
  };

  // ========== RESET PASSWORD HANDLER ==========
  const handleResetPassword = async (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận đặt lại mật khẩu",
      description: "Bạn có chắc chắn muốn đặt lại mật khẩu không? Mật khẩu mới sẽ là: 123456",
      onConfirm: async () => {
        try {
          const response = await userAdminApi.resetPassword(userId);
          toast.success(response.data?.message || "Đã đặt lại mật khẩu thành công!");
        } catch (error: any) {
          if (error.response?.status !== 403) {
            toast.error("Không thể đặt lại mật khẩu!");
          }
        }
      },
    });
  };
  // ========== COLUMN DEFINITIONS ==========
  const columns: DataTableColumn<UserStatus & { id: string }>[] = [
    {
      key: "user",
      header: "NGƯỜI DÙNG",
      sortable: true,
      width: 250,
      flexGrow: 1,
      render: (rowData: UserStatus) => {
        const user = rowData.user;
        const genderLabel =
          user.gender === "male"
            ? "Nam"
            : user.gender === "female"
            ? "Nữ"
            : "Khác";

        return (
          <UserCell
            avatar={user.avatar}
            name={user.display_name || user.username}
            username={`${user.username} • ${genderLabel}`}
          />
        );
      },
    },
    {
      key: "email",
      header: "EMAIL & SỐ ĐIỆN THOẠI",
      sortable: false,
      width: 220,
      flexGrow: 1,
      render: (rowData: UserStatus) => {
        const user = rowData.user;
        return (
          <div>
            <div style={{ fontWeight: 500, fontSize: "13px", color: "#374151" }}>
              {user.email}
            </div>
            {user.phone && (
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                {user.phone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "last_login",
      header: "ĐĂNG NHẬP CUỐI",
      sortable: true,
      width: 180,
      render: (rowData: UserStatus) => (
        <DateTimeCell date={rowData.last_login || ""} />
      ),
    },
    {
      key: "roles",
      header: "VAI TRÒ",
      sortable: true,
      width: 200,
      render: (rowData: UserStatus) => {
        return <UserRoleCell roles={rowData.roles} />;
      },
    },
    {
      key: "status",
      header: "TRẠNG THÁI",
      sortable: true,
      width: 140,
      render: (rowData: UserStatus) => (
        <Chip
          variant="soft"
          size="sm"
          color={getStatusColor(rowData.status)}
          sx={{ fontSize: "12px" }}
        >
          {rowData.status === "online" ? "Trực tuyến" : "Ngoại tuyến"}
        </Chip>
      ),
    },
    {
      key: "actions",
      header: "THAO TÁC",
      width: 100,
      align: "center",
      sortable: false,
      fixed: "right",
      render: (rowData: UserStatus) => {
        const isCurrentUser = currentUserId != null && String(rowData.user.id) === currentUserId;
        const canUpdate = hasPermission(PERMISSIONS.USER_UPDATE_GLOBAL);
        const canDelete = hasPermission(PERMISSIONS.USER_DELETE);
        const canResetPassword = hasPermission(PERMISSIONS.USER_RESET_PASSWORD);
        
        // If no actions available, render nothing
        if (!canUpdate && !canDelete && (!canResetPassword || isCurrentUser)) {
          return null;
        }

        return (
          <Box 
            sx={{ display: "flex", justifyContent: "center", width: "100%" }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Dropdown>
              <MenuButton
                slots={{ root: IconButton }}
                slotProps={{ root: { variant: "plain", color: "neutral", size: "sm" } }}
                sx={{ transform: 'none' }} // Fix positioning if needed
              >
                <MoreHorizontal size={20} />
              </MenuButton>
            <Menu placement="bottom-end" size="sm" sx={{ minWidth: 140, zIndex: 99999 }}>
              {canUpdate && (
                <MenuItem onClick={() => handleEdit(rowData)}>
                  <ListItemDecorator>
                    <Edit size={16} />
                  </ListItemDecorator>
                  Chỉnh sửa
                </MenuItem>
              )}
              
              { canResetPassword && (
                <MenuItem onClick={() => handleResetPassword(String(rowData.user.id))}>
                  <ListItemDecorator>
                    <KeyRound size={16} />
                  </ListItemDecorator>
                  Đổi mật khẩu
                </MenuItem>
              )}

              {canDelete && (
                <MenuItem 
                  onClick={() => handleDeleteSingle(String(rowData.user.id))}
                  color="danger"
                  sx={{ color: "danger.plainColor" }}
                >
                  <ListItemDecorator sx={{ color: "danger.plainColor" }}>
                    <Trash2 size={16} />
                  </ListItemDecorator>
                  Xóa
                </MenuItem>
              )}
            </Menu>
          </Dropdown>
        </Box>
        );
      },
    },
  ];


  // ========== UPDATE USER HANDLER ==========
  const handleUpdateUser = async (userId: string, formData: FormData) => {
    try {
      const response = await userAdminApi.updateUser(userId, formData);
      toast.success(response.message || "Cập nhật người dùng thành công!");

      fetchUsers();

      setIsUpdateModalOpen(false);
      setSelectedUserForUpdate(null);
    } catch (error: any) {
      if (error.response?.status !== 403) {
        const errorMessage =
          error.response?.data?.message || "Cập nhật thất bại!";
        toast.error(errorMessage);
      }
      throw error;
    }
  };

  // ========== DELETE HANDLER ==========
  const handleDelete = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xóa danh sách",
      description: `Bạn có chắc muốn xóa ${selectedUsers.length} người dùng đã chọn? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        try {
          toast.info(`Đang xử lý xóa ${selectedUsers.length} người dùng...`);
          for (const id of selectedUsers) {
            await userAdminApi.deleteUser(id);
          }
          toast.success(`Đã xóa ${selectedUsers.length} người dùng thành công!`);
          setSelectedUsers([]);
          fetchUsers();
        } catch (error: any) {
          if (error.response?.status !== 403) {
            toast.error("Có lỗi xảy ra khi xóa danh sách người dùng!");
          }
        }
      },
    });
  };

  const handleSubmit = async (formData: FormData) => {
    try {
      const res: any = await authApi.register(formData);
      
      // Check response status and success flag
      if (res.success === false || res.error) {
        // Handle error from API
        const errorMessage = res.message || res.error || "Tạo người dùng thất bại";
        toast.error(errorMessage);
        throw new Error(errorMessage); // Throw to prevent modal from closing
      }
      
      // Success case
      toast.success(res.message || "Tạo người dùng thành công!");
      fetchUsers();
      setIsOpen(false);
    } catch (err: any) {
      // Handle axios error or thrown error
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        
        // Don't show toast for 403 (permission denied - already handled by interceptor)
        if (status === 403) {
          throw err;
        }
        
        // Handle specific error cases
        if (status === 409) {
          // Conflict - username or email already exists
          const message = data.message || "Thông tin đã tồn tại";
          toast.error(`Tạo thất bại: ${message}`);
        } else if (status === 400) {
          // Bad request - validation error
          const message = data.message || "Dữ liệu không hợp lệ";
          toast.error(`Tạo thất bại: ${message}`);
        } else {
          // Other errors
          const message = data.message || err.message || "Đăng ký thất bại";
          toast.error(message);
        }
      } else {
        // Network error or other
        toast.error(err.message || "Đăng ký thất bại");
      }
      
      // Re-throw to keep modal open
      throw err;
    }
  };

  const advancedSearchContent = (
    <Stack spacing={2.5} sx={{ p: 2 }}>
      {/* Status Filter */}
      <Box>
        <Typography level="body-xs" sx={{ mb: 1, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Trạng thái
        </Typography>
        <SelectPicker
          data={[
            { label: "Tất cả", value: "all" },
            { label: "Trực tuyến", value: "online" },
            { label: "Ngoại tuyến", value: "offline" },
          ]}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value || "all")}
          searchable={false}
          cleanable={false}
          block
          placeholder="Chọn trạng thái"
        />
      </Box>

      {/* Gender Filter */}
      <Box>
        <Typography level="body-xs" sx={{ mb: 1, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Giới tính
        </Typography>
        <SelectPicker
          data={[
            { label: "Tất cả", value: "all" },
            { label: "Nam", value: "male" },
            { label: "Nữ", value: "female" },
            { label: "Khác", value: "other" },
          ]}
          value={genderFilter}
          onChange={(value) => setGenderFilter(value || "all")}
          searchable={false}
          cleanable={false}
          block
          placeholder="Chọn giới tính"
        />
      </Box>

      {/* Date Range Selector */}
      <Box>
        <Typography level="body-xs" sx={{ mb: 1, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Thời gian đăng nhập
        </Typography>
        <DateRangePicker
          format="dd/MM/yyyy"
          showOneCalendar
          value={fromDate && toDate ? [parseIsoDate(fromDate) as Date, parseIsoDate(toDate) as Date] : null}
          onChange={handleDateRangeChange}
          placeholder="Chọn khoảng thời gian"
          block
          character=" - "
        />
      </Box>
    </Stack>
  );

  const filterControls = (
    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
      <SelectPicker
        data={[
          { label: "Trạng thái: Tất cả", value: "all" },
          { label: "Trực tuyến", value: "online" },
          { label: "Ngoại tuyến", value: "offline" },
        ]}
        value={statusFilter}
        onChange={(value) => setStatusFilter(value || "all")}
        searchable={false}
        cleanable={false}
        size="sm"
        className="header-filter-picker"
        style={{ width: 160, height: 36 }}
      />
      <SelectPicker
        data={[
          { label: "Giới tính: Tất cả", value: "all" },
          { label: "Nam", value: "male" },
          { label: "Nữ", value: "female" },
          { label: "Khác", value: "other" },
        ]}
        value={genderFilter}
        onChange={(value) => setGenderFilter(value || "all")}
        searchable={false}
        cleanable={false}
        size="sm"
        className="header-filter-picker"
        style={{ width: 150, height: 36 }}
      />
      <DateRangePicker
        format="dd/MM/yyyy"
        showOneCalendar
        value={fromDate && toDate ? [parseIsoDate(fromDate) as Date, parseIsoDate(toDate) as Date] : null}
        onChange={handleDateRangeChange}
        placeholder="Thời gian đăng nhập"
        size="sm"
        character=" - "
        className="header-filter-picker"
        style={{ width: 220, height: 36 }}
      />
      <style>{`
        .header-filter-picker .rs-picker-toggle,
        .header-filter-picker.rs-picker .rs-picker-toggle,
        .header-filter-picker .rs-picker-daterange-calendar-group {
          height: 36px !important;
          display: flex !important;
          align-items: center !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          border-color: #e5e5ea !important;
          box-shadow: none !important;
        }
        .header-filter-picker .rs-picker-toggle:hover {
          border-color: #0665D0 !important;
        }
        /* Fix for DateRangePicker specifically */
        .header-filter-picker .rs-stack,
        .header-filter-picker .rs-picker-toggle-textbox {
          height: 36px !important;
          display: flex !important;
          align-items: center !important;
        }
        .header-filter-picker .rs-picker-toggle-value,
        .header-filter-picker .rs-picker-toggle-placeholder,
        .header-filter-picker .rs-picker-toggle-input {
          font-size: 14px !important;
          color: #111827 !important;
          line-height: 36px !important;
        }
        .header-filter-picker .rs-picker-input-group,
        .header-filter-picker .rs-picker-input-group.rs-input-group {
          height: 100% !important;
        }
      `}</style>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', bgcolor: '#F3F4F6', overflow: 'hidden' }}>
      {/* Breadcrumb Header */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'white', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Quản lý</Typography>
        <ChevronRight size={14} className="text-gray-400" />
        <Typography level="body-sm" sx={{ fontWeight: 600, color: 'text.primary' }}>Người dùng</Typography>
      </Box>

      <DataManagementLayout
        searchTerm={searchQuery}
        onSearchTermChange={setSearchQuery}
        onSearch={fetchUsers}
        searchPlaceholder="Tìm kiếm tên, email, username..."
        advancedOpen={isFilterDrawerOpen}
        onToggleAdvanced={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
        advancedContent={advancedSearchContent}
        filterControls={filterControls}
        searchBarExtras={
          <Stack direction="row" spacing={1} alignItems="center">
            {selectedUsers.length > 0 && (
              <Button
                color="danger"
                variant="soft"
                size="sm"
                startDecorator={<Trash2 size={16} />}
                onClick={handleDelete}
                sx={{ fontWeight: 600 }}
              >
                <span className="hidden sm:inline">Xóa {selectedUsers.length} mục</span>
              </Button>
            )}

            {hasPermission(PERMISSIONS.USER_CREATE) && (
              <Button
                startDecorator={<UserPlus size={18} />}
                onClick={() => setIsOpen(true)}
                sx={{
                  bgcolor: "#00568c",
                  color: "white",
                  "&:hover": { bgcolor: "#004470" },
                  borderRadius: "6px",
                  height: 36,
                  fontWeight: 600,
                  fontSize: "13px"
                }}
              >
                <span className="hidden sm:inline">Tạo người dùng</span>
              </Button>
            )}
          </Stack>
        }
        advancedActions={
          <Button
            fullWidth
            onClick={() => {
              fetchUsers();
              setIsFilterDrawerOpen(false);
            }}
            sx={{
              bgcolor: "#00568c",
              color: "white",
              "&:hover": { bgcolor: "#004470" },
              borderRadius: "6px",
              height: 40,
              fontWeight: 600
            }}
          >
            Áp dụng bộ lọc
          </Button>
        }
      >
        <DataTable
          data={users}
          columns={columns}
          total={totalUsers}
          rowSelection={{ mode: "multiRow", enableClickSelection: false }}
          onSelectionChange={(rows) => setSelectedUsers(rows.map(r => String(r.user.id)))}
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

      {/* Register Modal */}
      <RegisterForm 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleSubmit} 
      />

      {/* Update User Modal */}
      {selectedUserForUpdate && (
        <UpdateUserModal
          isOpen={isUpdateModalOpen}
          onClose={() => {
            setIsUpdateModalOpen(false);
            setSelectedUserForUpdate(null);
          }}
          user={selectedUserForUpdate}
          onSubmit={handleUpdateUser}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        confirmText="Xác nhận"
        cancelText="Hủy"
      />
    </Box>
  );
}
