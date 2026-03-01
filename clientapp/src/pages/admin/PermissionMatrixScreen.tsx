import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Sheet,
  Table,
  Checkbox,
  Stack,
  Chip,
  IconButton,
} from "@mui/joy";
import { Save, RefreshCw } from "lucide-react";
import { permissionMatrixApi } from "../../api/admin/permissionMatrixApi";
import type {
  PermissionMatrixData,
} from "../../types/admin/permissionMatrix";
import { toast } from "react-toastify";
import { ManagementPage, ManagementToolbar } from "../../components/admin/ManagementLayout";

export default function PermissionMatrixScreen() {
  const [matrixData, setMatrixData] = useState<PermissionMatrixData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [checkedState, setCheckedState] = useState<Map<string, Set<string>>>(
    new Map()
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Xử lý click checkbox "Chọn tất cả" cho 1 role
  // Logic:
  // - Nếu unchecked hoặc indeterminate → click → tick tất cả permission
  // - Nếu checked → click → bỏ tick tất cả permission
  const handleCheckAllForRole = (roleId: string, checked: boolean) => {
    setCheckedState((prev) => {
      const newState = new Map(prev);
      const allPermissions = getAllPermissions();

      // Nếu checked = true, tức người dùng muốn tick tất cả
      // Nếu checked = false, tức người dùng muốn bỏ tick tất cả
      allPermissions.forEach((permission) => {
        const roleSet = new Set(newState.get(permission.id) || []);

        if (checked) {
          // Tick: thêm roleId vào set
          roleSet.add(roleId);
        } else {
          // Untick: xóa roleId khỏi set
          roleSet.delete(roleId);
        }

        if (roleSet.size > 0) {
          newState.set(permission.id, roleSet);
        } else {
          newState.delete(permission.id);
        }
      });

      return newState;
    });
    setHasChanges(true);
  };

  // Lấy tất cả permission từ matrixData (không filter)
  const getAllPermissions = () => {
    if (!matrixData) return [];
    return matrixData.modules.flatMap((m) => m.permissions);
  };

  // Kiểm tra trạng thái checkbox "Chọn tất cả" cho 1 role
  // - true: TẤT CẢ permission của role được tick
  // - false: KHÔNG có permission nào được tick
  // - indeterminate: có ÍT NHẤT 1 permission được tick nhưng KHÔNG phải tất cả
  const getCheckAllStateForRole = (
    roleId: string
  ): { checked: boolean; indeterminate: boolean } => {
    if (!matrixData) return { checked: false, indeterminate: false };

    const allPermissions = getAllPermissions();
    if (allPermissions.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const allChecked = allPermissions.every((p) => isChecked(p.id, roleId));
    const someChecked = allPermissions.some((p) => isChecked(p.id, roleId));

    return {
      checked: allChecked,
      indeterminate: someChecked && !allChecked,
    };
  };

  // Kiểm tra trạng thái "Tất cả" cho 1 permission (theo hàng)
  const getCheckAllStateForPermission = (
    permissionId: string
  ): { checked: boolean; indeterminate: boolean } => {
    if (!matrixData) return { checked: false, indeterminate: false };

    const totalRoles = matrixData.roles.length;
    const checkedCount = checkedState.get(permissionId)?.size || 0;

    return {
      checked: checkedCount === totalRoles && totalRoles > 0,
      indeterminate: checkedCount > 0 && checkedCount < totalRoles,
    };
  };

  // Toggle tick tất cả roles cho 1 permission (theo hàng)
  const handleCheckAllForPermission = (permissionId: string, checked: boolean) => {
    if (!matrixData) return;
    setCheckedState((prev) => {
      const newState = new Map(prev);
      if (checked) {
        const allRoleIds = matrixData.roles.map((r) => r.id);
        newState.set(permissionId, new Set(allRoleIds));
      } else {
        newState.delete(permissionId);
      }
      return newState;
    });
    setHasChanges(true);
  };

  // Load data
  const loadMatrix = async () => {
    setIsLoading(true);
    try {
      const response = await permissionMatrixApi.get();
      setMatrixData(response.data);

      // Initialize checked state từ API
      const initialState = new Map<string, Set<string>>();
      response.data.modules.forEach((module) => {
        module.permissions.forEach((permission) => {
          initialState.set(permission.id, new Set(permission.checked_role_ids));
        });
      });
      setCheckedState(initialState);
      setHasChanges(false);
    } catch (error: any) {
      if (error.response?.status !== 403) {
        toast.error(error?.response?.data?.message || "Không thể tải dữ liệu");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  // Toggle checkbox
  const handleToggle = (permissionId: string, roleId: string) => {
    setCheckedState((prev) => {
      const newState = new Map(prev);
      const roleSet = new Set(newState.get(permissionId) || []);

      if (roleSet.has(roleId)) {
        roleSet.delete(roleId);
      } else {
        roleSet.add(roleId);
      }

      newState.set(permissionId, roleSet);
      return newState;
    });
    setHasChanges(true);
  };

  // Check if permission is checked for role
  const isChecked = (permissionId: string, roleId: string): boolean => {
    return checkedState.get(permissionId)?.has(roleId) || false;
  };

  // Save changes
  const handleSave = async () => {
    if (!matrixData) return;

    setIsSaving(true);
    try {
      // Build request: group by role
      const rolePermissionsMap = new Map<string, Set<string>>();

      // Initialize all roles
      matrixData.roles.forEach((role) => {
        rolePermissionsMap.set(role.id, new Set());
      });

      // Populate permissions for each role
      checkedState.forEach((roleIds, permissionId) => {
        roleIds.forEach((roleId) => {
          const permSet = rolePermissionsMap.get(roleId);
          if (permSet) {
            permSet.add(permissionId);
          }
        });
      });

      // Convert to request format
      const roles = Array.from(rolePermissionsMap.entries()).map(
        ([roleId, permissionIds]) => ({
          role_id: roleId,
          permission_ids: Array.from(permissionIds),
        })
      );

      const response = await permissionMatrixApi.update({ roles });
      toast.success(response.data.message);
      setHasChanges(false);

      // Reload để đồng bộ
      await loadMatrix();
    } catch (error: any) {
      if (error.response?.status !== 403) {
        toast.error(
          error?.response?.data?.message || "Không thể cập nhật quyền hạn"
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Filter modules by search
  const filteredModules = useMemo(() => {
    if (!matrixData || !searchQuery.trim()) return matrixData?.modules || [];

    const query = searchQuery.toLowerCase();
    return matrixData.modules
      .map((module) => ({
        ...module,
        permissions: module.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.key.toLowerCase().includes(query)
        ),
      }))
      .filter((module) => module.permissions.length > 0);
  }, [matrixData, searchQuery]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!matrixData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Không có dữ liệu</Typography>
      </Box>
    );
  }

  return (
    <ManagementPage
      title="Ma trận phân quyền"
      subtitle={`${matrixData?.roles.length || 0} vai trò, ${matrixData?.modules.reduce((sum, m) => sum + m.permissions.length, 0) || 0} quyền hạn`}
      onRefresh={loadMatrix}
      isRefreshing={isLoading}
      onCreate={handleSave}
      createLabel="Lưu thay đổi"
    >

      {/* Search & Actions Bar */}
      <ManagementToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm kiếm quyền hạn..."
        actions={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <IconButton
              onClick={() => {
                setIsLoading(true);
                loadMatrix();
              }}
              disabled={isSaving}
              sx={{
                height: 36,
                width: 36,
                bgcolor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                color: "#666",
                "&:hover": { bgcolor: "#f9fafb", borderColor: "#6b7280" },
              }}
            >
              <RefreshCw size={18} className={isSaving ? "animate-spin" : ""} />
            </IconButton>
            <Button
              startDecorator={<Save size={16} />}
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              loading={isSaving}
              sx={{
                height: 36,
                bgcolor: "#00568c",
                color: "white",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                px: 1.5,
                "&:hover": { bgcolor: "#004470" },
              }}
            >
              Lưu thay đổi
            </Button>
          </Box>
        }
      />

      <Sheet
        variant="outlined"
        sx={{
          borderRadius: "8px",
          overflow: "auto",
          flex: 1,
          minHeight: 0,
          bgcolor: "white",
          border: "1px solid #e5e7eb",
          overflowX: "auto",
          overflowY: "auto",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          '&::-webkit-scrollbar': {
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f9fafb',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#d1d5db',
            borderRadius: '4px',
          },
        }}
      >
        <Table
          stickyHeader
          sx={{
            minWidth: 'max-content',
            tableLayout: "auto",
            "& thead th": {
              bgcolor: "#f9fafb",
              color: "#374151",
              fontWeight: 600,
              borderBottom: "2px solid #e5e7eb",
              fontSize: "13px",
              padding: "12px 16px",
              verticalAlign: "top",
            },
            "& tbody tr:hover": {
              bgcolor: "#f9fafb",
            },
            "& tbody td": {
              borderBottom: "1px solid #f3f4f6",
              padding: "12px 16px",
              fontSize: "15px",
            },
            /* Responsive Sticky for 1st Column */
            "& thead th:nth-of-type(1)": {
              position: { xs: "sticky !important", sm: "sticky !important" },
              left: { xs: "auto !important", sm: "0 !important" },
              top: 0,
              zIndex: { xs: 10, sm: 8 },
              boxShadow: { xs: "none", sm: "2px 0 6px rgba(0,0,0,0.04)" },
            },
            "& tbody td:nth-of-type(1)": {
              position: { xs: "static !important", sm: "sticky !important" },
              left: { xs: "auto !important", sm: "0 !important" },
              zIndex: { xs: 1, sm: 7 },
            },
            /* Responsive Sticky for 2nd Column */
            "& thead th:nth-of-type(2)": {
              position: { xs: "sticky !important", sm: "sticky !important" },
              left: { xs: "auto !important", sm: "280px !important" },
              top: 0,
              zIndex: { xs: 9, sm: 8 },
              borderRight: "1px solid #e5e7eb",
            },
            "& tbody td:nth-of-type(2)": {
              position: { xs: "static !important", sm: "sticky !important" },
              left: { xs: "auto !important", sm: "280px !important" },
              zIndex: { xs: 1, sm: 7 },
              borderRight: "1px solid #e5e7eb",
            },
            /* Backgrounds for sticky columns */
            "& thead th:nth-of-type(1), & thead th:nth-of-type(2)": {
              bgcolor: "#f9fafb !important",
            },
            "& tbody td:nth-of-type(1), & tbody td:nth-of-type(2)": {
              bgcolor: "white !important",
            },
            "& tbody tr.module-row td": {
              bgcolor: "#f9fafb !important",
            },
          }}
        >
          <thead>
            <tr>
              <th style={{ 
                width: 280, 
                minWidth: 280, 
                textAlign: 'center',
                verticalAlign: 'middle',
                top: 0,
                borderRight: '1px solid #e5e7eb',
              }}>
                QUYỀN HẠN
              </th>
              {/* New column: Tất cả (per-permission select all) */}
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap', paddingLeft: '12px', paddingRight: '12px', minWidth: 90, top: 0, borderRight: '1px solid #e5e7eb' }}>
                Tất cả
              </th>

              {matrixData.roles.map((role) => (
                <th
                  key={role.id}
                  style={{
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    paddingLeft: "12px",
                    paddingRight: "12px",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    background: "#f9fafb",
                  }}
                  title={role.name}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '100%' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {role.name}
                    </div>
                    {(() => {
                      const state = getCheckAllStateForRole(role.id);
                      return (
                        <Checkbox
                          checked={state.checked}
                          indeterminate={state.indeterminate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            handleCheckAllForRole(role.id, e.target.checked);
                          }}
                          title={state.checked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                          sx={{
                            "&.Mui-checked": {
                              color: "#374151",
                            },
                          }}
                        />
                      );
                    })()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredModules.map((module) => (
              <>
                  <tr key={`module-${module.id}`} className="module-row">
                    {/* Module name - sticky at left:0 */}
                    <td
                      style={{
                        fontWeight: 600,
                        padding: "12px 16px",
                        color: "#374151",
                        minWidth: 280,
                        borderRight: '1px solid #e5e7eb',
                      }}
                    >
                      {module.name}
                    </td>
                    {/* Tất cả cell for module row - sticky at left:280 */}
                    <td
                      style={{
                        fontWeight: 600,
                        padding: "12px 16px",
                        color: "#374151",
                        minWidth: 90,
                        borderRight: '1px solid #e5e7eb',
                      }}
                    >
                    </td>
                    {/* Remaining role columns */}
                    <td
                      colSpan={matrixData.roles.length}
                      style={{
                        backgroundColor: "#f9fafb",
                        fontWeight: 600,
                        padding: "12px 16px",
                        color: "#374151",
                      }}
                      >
                    </td>
                  </tr>

                  {module.permissions.map((permission) => (
                    <tr key={permission.id}>
                      <td style={{ 
                        textAlign: 'center', 
                        minWidth: 280, 
                        verticalAlign: 'middle',
                        borderRight: '1px solid #e5e7eb',
                      }}>
                        <Box sx={{ pl: 2, textAlign: 'left' }}>
                          <Typography
                            level="body-sm"
                            fontWeight="500"
                            sx={{ color: "#374151" }}
                          >
                            {permission.name}
                          </Typography>
                        </Box>
                      </td>

                      {/* Tất cả column: tick tất cả roles cho permission này */}
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px', minWidth: 90, borderRight: '1px solid #e5e7eb' }}>
                        <Checkbox
                          checked={getCheckAllStateForPermission(permission.id).checked}
                          indeterminate={getCheckAllStateForPermission(permission.id).indeterminate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCheckAllForPermission(permission.id, e.target.checked)}
                          sx={{
                            "&.Mui-checked": {
                              color: "#00568c",
                            },
                          }}
                        />
                      </td>

                    {matrixData.roles.map((role) => (
                      <td 
                        key={role.id} 
                        style={{ 
                          textAlign: "center",
                          verticalAlign: "middle",
                          padding: "12px",
                        }}
                      >
                        <Checkbox
                          checked={isChecked(permission.id, role.id)}
                          onChange={() => handleToggle(permission.id, role.id)}
                          sx={{
                            "&.Mui-checked": {
                              color: "#00568c",
                            },
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </Table>
      </Sheet>

      <Box
        sx={{
          mt: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Stack direction="row" spacing={3}>
          <Typography level="body-sm" sx={{ color: "#00568c" }}>
            Tổng số: {matrixData.roles.length} vai trò
          </Typography>
          <Typography level="body-sm" sx={{ color: "#00568c" }}>
            {filteredModules.reduce((acc, m) => acc + m.permissions.length, 0)}{" "}
            quyền
          </Typography>
        </Stack>
        {hasChanges && (
          <Chip variant="soft" sx={{ color: "#00568c" }} size="sm">
            Có thay đổi chưa lưu
          </Chip>
        )}
      </Box>
    </ManagementPage>
  );
}
