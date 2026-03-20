import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Stack,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  ListItemDecorator,
} from "@mui/joy";
import { Drawer, SelectPicker } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import { Trash2, RefreshCw, Plus, Edit, ChevronRight, MoreHorizontal } from "lucide-react";
import { permissionAdminApi } from "../../api/admin/permissionAdminApi";
import {
  moduleAdminApi,
  type PermissionModule,
} from "../../api/admin/moduleAdminApi";
import type { Permission } from "../../types/admin/role";
import { toast } from "react-toastify";
import PermissionModal from "../../components/admin/PermissionModal";
import ConfirmModal from "../../components/notification/ConfirmModal";
import { PERMISSIONS } from "../../constants/menuPermissions";
import { usePermissions } from "../../hooks/usePermissions";

import DataManagementLayout from "../../components/admin/DataManagementLayout";
import DataTable from "../../components/admin/DataTable";
import type { DataTableColumn } from "../../components/admin/DataTable";
import {
  DateTimeCell,
} from "../../components/admin/ModernDataTable";

export default function PermissionManagerScreen() {
  const { hasPermission } = usePermissions();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPermissions, setTotalPermissions] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [pageSize, setPageSize] = useState(15);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // ========== LOAD MODULES ==========
  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const moduleList = await moduleAdminApi.getAll();
      setModules(moduleList);
    } catch (error) {
      console.error("Error loading modules:", error);
    }
  };

  const getModuleName = (moduleId?: string) => {
    if (!moduleId) return "—";
    const module = modules.find((m) => m.id === moduleId);
    return module ? module.name : "—";
  };

  // ========== FETCH DATA ==========
  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const response = await permissionAdminApi.getList(
        currentPage,
        pageSize,
        searchQuery,
        moduleFilter
      );
      if (response && response.data) {
        setPermissions(response.data.items || []);
        setTotalPermissions(response.data.pagination?.total || 0);
      }
    } catch (error: any) {
      console.error("Error fetching permissions:", error);
      if (error.response?.status !== 403) {
        toast.error("Không thể tải danh sách quyền hạn!");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [currentPage, pageSize, searchQuery, moduleFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, moduleFilter]);

  // ========== EDIT HANDLER ==========
  const handleEdit = (permission: Permission) => {
    setSelectedPermission(permission);
    setIsModalOpen(true);
  };

  // ========== DELETE SINGLE ==========
  const handleDeleteSingle = async (permissionId: string, permissionName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xóa",
      description: `Bạn có chắc muốn xóa quyền "${permissionName}"? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        try {
          await permissionAdminApi.delete(permissionId);
          toast.success(`Đã xóa quyền "${permissionName}"!`);
          fetchPermissions();
        } catch (error: any) {
          if (error.response?.status !== 403) {
            toast.error(error?.response?.data?.message || "Không thể xóa quyền!");
          }
        }
      },
    });
  };

  // ========== COLUMN DEFINITIONS ==========
  const columns: DataTableColumn<Permission>[] = [
    {
      key: "name",
      header: "TÊN QUYỀN",
      width: 250,
      flexGrow: 1,
      render: (rowData: Permission) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>
            {rowData.name}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            {rowData.code}
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "MÔ TẢ",
      flexGrow: 2,
      render: (rowData: Permission) => (
        <div style={{ fontSize: "13px", color: "#6b7280" }}>
          {rowData.description || "—"}
        </div>
      ),
    },
    {
      key: "module_id",
      header: "NHÓM QUYỀN",
      width: 180,
      render: (rowData: Permission) => (
        <Chip
          variant="soft"
          size="sm"
          sx={{
            bgcolor: "#E0F2FE",
            color: "#00568c",
            fontWeight: "600",
            fontSize: "12px",
          }}
        >
          {getModuleName(rowData.module_id)}
        </Chip>
      ),
    },
    {
      key: "created_at",
      header: "NGÀY TẠO",
      width: 200,
      render: (rowData: Permission) => (
        <DateTimeCell date={rowData.created_at} />
      ),
    },
    {
      key: "actions",
      header: "THAO TÁC",
      width: 100,
      align: "center",
      sortable: false,
      fixed: "right",
      render: (rowData: Permission) => (
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <Dropdown>
            <MenuButton
              slots={{ root: IconButton }}
              slotProps={{ root: { variant: "plain", color: "neutral", size: "sm" } }}
            >
              <MoreHorizontal size={20} />
            </MenuButton>
            <Menu placement="bottom-end" size="sm" sx={{ minWidth: 140, zIndex: 99999 }}>
              {hasPermission(PERMISSIONS.PERMISSION_UPDATE) && (
                <MenuItem onClick={() => handleEdit(rowData)}>
                  <ListItemDecorator>
                    <Edit size={16} />
                  </ListItemDecorator>
                  Chỉnh sửa
                </MenuItem>
              )}
              {hasPermission(PERMISSIONS.PERMISSION_DELETE) && (
                <MenuItem 
                  onClick={() => handleDeleteSingle(rowData.id, rowData.name)}
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
      ),
    },
  ];

  // ========== MODAL HANDLERS ==========
  const handleOpenModal = () => {
    setSelectedPermission(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedPermission(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (formData: any) => {
    try {
      if (selectedPermission) {
        await permissionAdminApi.update(selectedPermission.id, formData);
        toast.success("Cập nhật quyền thành công!");
      } else {
        await permissionAdminApi.create(formData);
        toast.success("Tạo quyền thành công!");
      }
      fetchPermissions();
      handleCloseModal();
    } catch (error: any) {
      if (error.response?.status !== 403) {
        toast.error(error?.response?.data?.message || "Có lỗi xảy ra!");
      }
      throw error;
    }
  };

  const advancedSearchContent = (
    <Stack spacing={2.5} sx={{ p: 2 }}>
      <Box>
        <Typography level="body-xs" sx={{ mb: 1, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Module
        </Typography>
        <SelectPicker
          data={[
            { label: "Tất cả", value: "all" },
            ...modules.map(m => ({ label: m.name, value: m.id }))
          ]}
          value={moduleFilter}
          onChange={(value) => setModuleFilter(value || "all")}
          searchable={false}
          cleanable={false}
          block
          placeholder="Chọn module"
        />
      </Box>
    </Stack>
  );

  const filterControls = (
    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
        <SelectPicker
          data={[
            { label: "Module: Tất cả", value: "all" },
            ...modules.map(m => ({ label: m.name, value: m.id }))
          ]}
          value={moduleFilter}
          onChange={(value) => setModuleFilter(value || "all")}
          searchable={false}
          cleanable={false}
          size="sm"
          className="header-filter-picker"
          style={{ width: 200 }}
        />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', bgcolor: '#F3F4F6', overflow: 'hidden' }}>
      {/* Breadcrumb Header */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'white', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Quản lý</Typography>
        <ChevronRight size={14} className="text-gray-400" />
        <Typography level="body-sm" sx={{ fontWeight: 600, color: 'text.primary' }}>Quyền hạn</Typography>
      </Box>

      <DataManagementLayout
        searchTerm={searchQuery}
        onSearchTermChange={setSearchQuery}
        onSearch={fetchPermissions}
        searchPlaceholder="Tìm kiếm tên, code..."
        advancedOpen={isFilterDrawerOpen}
        onToggleAdvanced={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
        advancedContent={advancedSearchContent}
        filterControls={filterControls}
        searchBarExtras={
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              onClick={() => {
                setIsRefreshing(true);
                fetchPermissions();
              }}
              disabled={isRefreshing}
              variant="outlined"
              size="sm"
              sx={{ bgcolor: 'white', height: 36, width: 36 }}
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </IconButton>

            {hasPermission(PERMISSIONS.PERMISSION_CREATE) && (
              <Button
                startDecorator={<Plus size={18} />}
                onClick={handleOpenModal}
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
                <span className="hidden sm:inline">Tạo quyền hạn</span>
              </Button>
            )}
          </Stack>
        }
        advancedActions={
          <Button
            fullWidth
            onClick={() => {
              fetchPermissions();
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
          data={permissions}
          columns={columns}
          total={totalPermissions}
          page={currentPage}
          limit={pageSize}
          onChangePage={setCurrentPage}
          onChangeLimit={setPageSize}
          rowKey="id"
          serverSidePagination={true}
          enableNativePagination={false}
          limitOptions={[15, 30, 50, 100]}
          autoFitHeight
          autoFitBottomGap={0}
        />
      </DataManagementLayout>

      {/* Permission Modal */}
      <PermissionModal
        open={isModalOpen}
        onClose={handleCloseModal}
        initialData={selectedPermission}
        onSubmit={handleSubmit}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </Box>
  );
}
