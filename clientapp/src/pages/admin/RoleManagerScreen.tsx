import { useState, useEffect, useCallback } from "react";
import { Box, Button, Typography, Dropdown, Menu, MenuButton, MenuItem, ListItemDecorator, IconButton } from "@mui/joy";
import { Trash2, Plus, Edit, ChevronRight, MoreHorizontal, ShieldCheck } from "lucide-react";
import { roleAdminApi } from "../../api/admin/roleAdminApi";
import type { Role } from "../../types/admin/role";
import { toast } from "react-toastify";
import RoleModal from "../../components/admin/RoleModal";
import ConfirmModal from "../../components/notification/ConfirmModal";
import DataTable from "../../components/admin/DataTable";
import type { DataTableColumn } from "../../components/admin/DataTable";
import DataManagementLayout from "../../components/admin/DataManagementLayout";
import { PERMISSIONS } from "../../constants/menuPermissions";
import { usePermissions } from "../../hooks/usePermissions";

export default function RoleManagerScreen() {
  const { hasPermission } = usePermissions();

  // ========== STATE ==========
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalRoles, setTotalRoles] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: async () => {},
  });

  // ========== FETCH ==========
  const fetchRoles = useCallback(async () => {
    try {
      const response = await roleAdminApi.getList(currentPage, pageSize, searchQuery);
      if (response && response.data) {
        setRoles(response.data.items || []);
        setTotalRoles(response.data.pagination?.total || 0);
      }
    } catch (error: any) {
      if (error.response?.status !== 403) {
        toast.error("Không thể tải danh sách vai trò!");
      }
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Reset to page 1 when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ========== HANDLERS ==========
  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleDeleteSingle = (roleId: string, roleName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xóa",
      description: `Bạn có chắc muốn xóa vai trò "${roleName}"? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        try {
          await roleAdminApi.delete(roleId);
          toast.success(`Đã xóa vai trò "${roleName}"!`);
          fetchRoles();
        } catch (error: any) {
          if (error.response?.status !== 403) {
            toast.error(error?.response?.data?.message || "Không thể xóa vai trò!");
          }
        }
      },
    });
  };

  const handleOpenModal = () => {
    setSelectedRole(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedRole(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (formData: any) => {
    try {
      if (selectedRole) {
        await roleAdminApi.update(selectedRole.id, formData);
        toast.success("Cập nhật vai trò thành công!");
      } else {
        await roleAdminApi.create(formData);
        toast.success("Tạo vai trò thành công!");
      }
      fetchRoles();
      handleCloseModal();
    } catch (error: any) {
      if (error.response?.status !== 403) {
        toast.error(error?.response?.data?.message || "Có lỗi xảy ra!");
      }
      throw error;
    }
  };

  // ========== FORMAT DATE ==========
  const formatDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // ========== COLUMN DEFINITIONS ==========
  const columns: DataTableColumn<Role>[] = [
    {
      key: "name",
      header: "TÊN VAI TRÒ",
      flexGrow: 1,
      sortable: true,
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%" }}>
          <ShieldCheck size={16} color="#00568c" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{row.name}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{row.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "MÔ TẢ",
      flexGrow: 1,
      sortable: false,
      render: (row) => (
        <span style={{ fontSize: 13, color: "#6b7280" }}>{row.description || "—"}</span>
      ),
    },
    {
      key: "created_at",
      header: "NGÀY TẠO",
      width: 130,
      sortable: true,
      dataKey: "created_at",
      render: (row) => (
        <span style={{ fontSize: 13, color: "#374151" }}>{formatDate(row.created_at)}</span>
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
        const canUpdate = hasPermission(PERMISSIONS.ROLE_UPDATE);
        const canDelete = hasPermission(PERMISSIONS.ROLE_DELETE);
        if (!canUpdate && !canDelete) return null;
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
                sx={{ transform: "none" }}
              >
                <MoreHorizontal size={20} />
              </MenuButton>
              <Menu placement="bottom-end" size="sm" sx={{ minWidth: 140, zIndex: 99999 }}>
                {canUpdate && (
                  <MenuItem onClick={() => handleEdit(row)}>
                    <ListItemDecorator><Edit size={16} /></ListItemDecorator>
                    Chỉnh sửa
                  </MenuItem>
                )}
                {canDelete && (
                  <MenuItem
                    onClick={() => handleDeleteSingle(row.id, row.name)}
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh", bgcolor: "#F3F4F6", overflow: "hidden" }}>
      {/* Breadcrumb Header */}
      <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1, bgcolor: "white", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
        <Typography level="body-sm" sx={{ color: "text.secondary" }}>Quản lý</Typography>
        <ChevronRight size={14} className="text-gray-400" />
        <Typography level="body-sm" sx={{ fontWeight: 600, color: "text.primary" }}>Vai trò</Typography>
        <Typography level="body-sm" sx={{ color: "text.tertiary", ml: "auto" }}>
          {totalRoles > 0 ? `${totalRoles} vai trò` : ""}
        </Typography>
      </Box>

      <DataManagementLayout
        searchTerm={searchQuery}
        onSearchTermChange={setSearchQuery}
        onSearch={fetchRoles}
        searchPlaceholder="Tìm kiếm vai trò..."
        advancedOpen={false}
        onToggleAdvanced={() => {}}
        searchBarExtras={
          hasPermission(PERMISSIONS.ROLE_CREATE) ? (
            <Button
              startDecorator={<Plus size={16} />}
              onClick={handleOpenModal}
              sx={{
                bgcolor: "#00568c",
                color: "white",
                "&:hover": { bgcolor: "#004470" },
                borderRadius: "6px",
                height: 36,
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              <span className="hidden sm:inline">Tạo vai trò</span>
            </Button>
          ) : undefined
        }
      >
        <DataTable
          data={roles}
          columns={columns}
          total={totalRoles}
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

      {/* Role Modal */}
      <RoleModal
        open={isModalOpen}
        onClose={handleCloseModal}
        initialData={selectedRole}
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
