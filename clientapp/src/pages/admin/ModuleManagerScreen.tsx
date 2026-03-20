import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  ListItemDecorator,
} from "@mui/joy";
import { Trash2, RefreshCw, Plus, Edit, ChevronRight, MoreHorizontal } from "lucide-react";
import {
  moduleAdminApi,
  type PermissionModule,
} from "../../api/admin/moduleAdminApi";
import { toast } from "react-toastify";
import ModuleModal from "../../components/admin/ModuleModal";
import ConfirmModal from "../../components/notification/ConfirmModal";
import { PERMISSIONS } from "../../constants/menuPermissions";
import { usePermissions } from "../../hooks/usePermissions";

import { DateTimeCell } from "../../components/admin/ModernDataTable";
import DataTable from "../../components/admin/DataTable";
import type { DataTableColumn } from "../../components/admin/DataTable";
import DataManagementLayout from "../../components/admin/DataManagementLayout";

export default function ModuleManagerScreen() {
  const { hasPermission } = usePermissions();
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalModules, setTotalModules] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<PermissionModule | null>(null);
  const [pageSize, setPageSize] = useState(15);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // ========== FETCH DATA ==========
  const fetchModules = async () => {
    setIsLoading(true);
    try {
      const response = await moduleAdminApi.getList(
        currentPage,
        pageSize,
        searchQuery
      );

      if (response && response.data) {
        setModules(response.data.items || []);
        setTotalModules(response.data.pagination?.total || 0);
      }
    } catch (error: any) {
      console.error("Error fetching modules:", error);
      if (error.response?.status !== 403) {
        toast.error("Không thể tải danh sách nhóm quyền!");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [currentPage, pageSize, searchQuery]);

  // ========== EDIT HANDLER ==========
  const handleEdit = (module: PermissionModule) => {
    setSelectedModule(module);
    setIsModalOpen(true);
  };

  // ========== DELETE SINGLE ==========
  const handleDeleteSingle = async (moduleId: string, moduleName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xóa",
      description: `Bạn có chắc muốn xóa nhóm quyền "${moduleName}"? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        try {
          await moduleAdminApi.delete(moduleId);
          toast.success(`Đã xóa nhóm quyền "${moduleName}"!`);
          fetchModules();
        } catch (error: any) {
          if (error.response?.status !== 403) {
            toast.error(error?.response?.data?.message || "Không thể xóa nhóm quyền!");
          }
        }
      },
    });
  };

  // ========== COLUMN DEFINITIONS ==========
  const columns: DataTableColumn<PermissionModule>[] = [
    {
      key: "name",
      header: "TÊN NHÓM QUYỀN",
      width: 250,
      flexGrow: 1,
      render: (rowData: PermissionModule) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>
            {rowData.name}
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "MÔ TẢ",
      flexGrow: 2,
      render: (rowData: PermissionModule) => (
        <div style={{ fontSize: "13px", color: "#6b7280" }}>
          {rowData.description || "—"}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "NGÀY TẠO",
      width: 200,
      render: (rowData: PermissionModule) => (
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
      render: (rowData: PermissionModule) => (
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <Dropdown>
            <MenuButton
              slots={{ root: IconButton }}
              slotProps={{ root: { variant: "plain", color: "neutral", size: "sm" } }}
            >
              <MoreHorizontal size={20} />
            </MenuButton>
            <Menu placement="bottom-end" size="sm" sx={{ minWidth: 140, zIndex: 99999 }}>
              {hasPermission(PERMISSIONS.MODULE_UPDATE) && (
                <MenuItem onClick={() => handleEdit(rowData)}>
                  <ListItemDecorator>
                    <Edit size={16} />
                  </ListItemDecorator>
                  Chỉnh sửa
                </MenuItem>
              )}
              {hasPermission(PERMISSIONS.MODULE_DELETE) && (
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
    setSelectedModule(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedModule(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (formData: any) => {
    try {
      if (selectedModule) {
        await moduleAdminApi.update(selectedModule.id, formData);
        toast.success("Cập nhật nhóm quyền thành công!");
      } else {
        await moduleAdminApi.create(formData);
        toast.success("Tạo nhóm quyền thành công!");
      }
      fetchModules();
      handleCloseModal();
    } catch (error: any) {
      if (error.response?.status !== 403) {
        toast.error(error?.response?.data?.message || "Có lỗi xảy ra!");
      }
      throw error;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', bgcolor: '#F3F4F6', overflow: 'hidden' }}>
      {/* Breadcrumb Header */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'white', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Quản lý</Typography>
        <ChevronRight size={14} className="text-gray-400" />
        <Typography level="body-sm" sx={{ fontWeight: 600, color: 'text.primary' }}>Nhóm quyền</Typography>
      </Box>

      <DataManagementLayout
        searchTerm={searchQuery}
        onSearchTermChange={setSearchQuery}
        onSearch={fetchModules}
        searchPlaceholder="Tìm kiếm tên nhóm quyền..."
        advancedOpen={false}
        onToggleAdvanced={() => {}}
        searchBarExtras={
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              onClick={() => {
                setIsRefreshing(true);
                fetchModules();
              }}
              disabled={isRefreshing}
              variant="outlined"
              size="sm"
              sx={{ bgcolor: 'white', height: 36, width: 36 }}
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </IconButton>

            {hasPermission(PERMISSIONS.MODULE_CREATE) && (
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
                <span className="hidden sm:inline">Tạo nhóm quyền</span>
              </Button>
            )}
          </Stack>
        }
      >
        <DataTable
          data={modules}
          columns={columns}
          total={totalModules}
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

      {/* Module Modal */}
      <ModuleModal
        open={isModalOpen}
        onClose={handleCloseModal}
        initialData={selectedModule}
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
