// components/admin/UserTableAg.tsx
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  ICellRendererParams,
  IHeaderParams,
  GridApi,
} from "ag-grid-community";
import {
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
} from "react";
import { Filter, MoreHorizontal, Plus } from "lucide-react";
import { format } from "date-fns";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import type { UserStatus } from "../../types/admin/user";

// --- Custom Header Component ---
const CustomHeader = (props: IHeaderParams) => (
  <div className="flex items-center justify-between w-full h-full px-3">
    <span className="text-sm font-semibold text-gray-700">
      {props.displayName}
    </span>
    {props.enableMenu && (
      <Filter size={14} className="text-gray-400 flex-shrink-0" />
    )}
  </div>
);

// --- UserTable Props ---
interface UserTableAgProps {
  users: UserStatus[];
  searchTerm: string;
  statusFilter: string;
  loading?: boolean;
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function UserTableAg({
  users,
  searchTerm,
  statusFilter,
  loading = false,
  page,
  total,
  limit,
  onPageChange,
}: UserTableAgProps) {
  const gridRef = useRef<AgGridReact<UserStatus>>(null);
  const [selectedRows, setSelectedRows] = useState<UserStatus[]>([]);
  const [gridApi, setGridApi] = useState<GridApi<UserStatus> | null>(null);

  // --- Action menu cell ---
  const ActionMenuCell = useCallback(
    (params: ICellRendererParams<UserStatus>) => {
      if (!params.data) return null;
      return (
        <div className="flex items-center justify-center h-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              alert(`Hành động cho: ${params.data?.user.display_name}`);
            }}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          >
            <MoreHorizontal size={16} className="text-gray-500" />
          </button>
        </div>
      );
    },
    []
  );
  const firstRow: UserStatus = {
    user: {
      id: "",
      created_at: "",
      updated_at: "",
      username: "",
      email: "",
      avatar: "",
      phone: "",
      display_name: "",
      birthday: "",
      gender: "",
      is_completed_friend_setup: false,
      is_profile_complete: false, // boolean thay vì string
    },
    messages_count: 0,
    status: "offline",
  };

  // --- Status Badge ---
  const StatusBadge = useCallback((params: ICellRendererParams<UserStatus>) => {
    if (!params.data) return null;
    const status = params.data.status as "online" | "offline"; // ép kiểu an toàn
    const badgeConfig: Record<
      string,
      { bg: string; text: string; border: string; dot: string; label: string }
    > = {
      online: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        dot: "bg-emerald-500",
        label: "Hoạt động",
      },
      offline: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        dot: "bg-red-500",
        label: "Offline",
      },
    };
    const config = badgeConfig[status] ?? {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-200",
      dot: "bg-yellow-500",
      label: "Không xác định",
    };

    return (
      <div className="flex items-center h-full">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold border shadow-sm inline-flex items-center gap-1.5 ${config.bg} ${config.text} ${config.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
          {config.label}
        </span>
      </div>
    );
  }, []);

  // --- Add Button in header ---
  const AddButtonHeader = useCallback(
    () => (
      <div className="flex items-center justify-center h-full w-full">
        <button
          onClick={() => alert("Mở form thêm người dùng")}
          title="Thêm người dùng mới"
          className="w-7 h-7 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center transition-all group"
        >
          <Plus
            size={14}
            className="text-gray-400 group-hover:text-blue-600 transition-colors"
          />
        </button>
      </div>
    ),
    []
  );

  // --- Format Date ---
  const formatDate = useCallback((dateString: string): string => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss");
    } catch {
      return "—";
    }
  }, []);

  // --- Column Definitions ---
  const columnDefs: ColDef<UserStatus>[] = useMemo(
    () => [
      {
        headerName: "",
        width: 30,
        pinned: "left",
        cellRenderer: (params: ICellRendererParams<UserStatus>) => {
          if (params.data?.user.id === "") {
            return (
              <button
                onClick={() => alert("Gộp các cột bên phải")}
                className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
              >
                +
              </button>
            );
          }
          return <MoreHorizontal size={16} className="text-gray-500" />;
        },
        sortable: false,
        filter: false,
        lockPosition: true,
        suppressHeaderMenuButton: true,
      },

      // Tên đăng nhập
      {
        headerName: "Tên đăng nhập",

        field: "user.username",
        flex: 1.5,
        sortable: true,
        filter: "agTextColumnFilter",
        floatingFilter: true, // bật input filter
        headerClass: "text-gray-500 center",
        checkboxSelection: true, // ✅ thêm checkbox ở cột này
        headerCheckboxSelection: true, // ✅ checkbox chọn tất cả ở header
        cellRendererParams: {
          suppressCount: true, // ẩn số lượng checkbox đã chọn
        },
      },

      {
        headerName: "Họ tên",
        field: "user.display_name",
        flex: 2,
        sortable: true,
        filter: "agTextColumnFilter",
        floatingFilter: true, // bật input filter
        headerClass: "text-gray-500 center",

        // thêm icon Filter bằng pseudo-element CSS hoặc custom Header component nhỏ
      },

      // Email
      {
        headerName: "Email",

        headerClass: "text-gray-500",
        field: "user.email",
        flex: 2,
        sortable: true,
        filter: "agTextColumnFilter",
      },

      // Số lượng tin nhắn
      {
        headerName: "Số lượng tin",

        headerClass: "text-gray-500",
        valueGetter: (params) => params.data?.messages_count,
        flex: 2,
        sortable: true,
        filter: "agTextColumnFilter",
      },

      // Ngày tạo
      {
        headerName: "Ngày tạo",
        floatingFilter: true, // bật input filter
        headerClass: "text-gray-500 center",
        field: "user.created_at",
        flex: 1.6,
        filter: "agDateColumnFilter",
        valueFormatter: (params) =>
          params.value
            ? format(new Date(params.value as string), "dd/MM/yyyy HH:mm:ss")
            : "—",
      },

      // Trạng thái
      {
        headerName: "Trạng thái",

        floatingFilter: true, // bật input filter
        headerClass: "text-gray-500 center",
        field: "status",
        flex: 1.3,
        cellRenderer: StatusBadge,
        sortable: true,
        filter: "agTextColumnFilter",

        valueGetter: (params) =>
          params.data?.status === "online" ? "Hoạt động" : "Offline",
      },
    ],
    []
  );

  // --- Grid Ready ---
  const onGridReady = useCallback((params: { api: GridApi<UserStatus> }) => {
    setGridApi(params.api);
  }, []);

  const onSelectionChanged = useCallback(() => {
    if (gridApi) setSelectedRows(gridApi.getSelectedRows());
  }, [gridApi]);

  const handleDeselectAll = useCallback(() => {
    gridApi?.deselectAll();
  }, [gridApi]);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}

      {/* AG Grid */}
      <div className="ag-theme-alpine" style={{ height: "650px" }}>
        <AgGridReact<UserStatus>
          ref={gridRef}
          rowData={[firstRow, ...users]}
          columnDefs={columnDefs}
          rowSelection="multiple"
          suppressRowClickSelection
          animateRows
          loading={loading}
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
            floatingFilter: true,
            filterParams: { buttons: ["reset", "apply"], closeOnApply: true },
          }}
          pagination
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          rowHeight={43}
          headerHeight={50}
          floatingFiltersHeight={45}
          domLayout="normal"
          getRowId={(params) =>
            params.data?.user?.id ?? Math.random().toString()
          }
          isFullWidthRow={(params) => params.context === 0} // chỉ dòng đầu tiên
          fullWidthCellRenderer={AddButtonHeader}
          getRowClass={(params) =>
            params.rowIndex === 0
              ? "bg-white"
              : "hover:bg-blue-50/30 transition-colors"
          }
        />
      </div>

      {/* Footer */}
      <div className="px-8 py-4 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-gray-600">Đã chọn: </span>
              <span className="font-bold text-blue-600">
                {selectedRows.length}
              </span>
              <span className="text-gray-600"> / {users.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Tổng bản ghi: </span>
              <span className="font-bold text-gray-800">{users.length}</span>
            </div>
          </div>

          {selectedRows.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={handleDeselectAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
              >
                Bỏ chọn tất cả
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm">
                Thao tác ({selectedRows.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
