import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Select,
  Option,
  Chip,
  IconButton,
  Stack,
} from "@mui/joy";
import { Drawer, SelectPicker } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import {
  RefreshCw,
  Plus,
  Edit,
} from "lucide-react";
import { toast } from "react-toastify";
import CreateNotificationForm from "../../components/admin/CreateNotificationForm";
import ModernDataTable, {
  DateTimeCell,
} from "../../components/admin/ModernDataTable";
import type { ColumnConfig } from "../../components/admin/ModernDataTable";
import { ManagementPage, ManagementToolbar, MANAGEMENT_FILTER_SX } from "../../components/admin/ManagementLayout";

interface NotificationChannel {
  id: string;
  name: string;
  description: string | null;
  type: "system" | "broadcast" | "targeted";
  memberCount: number;
  createdAt: string;
}

// ==================== MOCK DATA ====================
const mockChannels: NotificationChannel[] = [
  {
    id: "1",
    name: "Thông báo hệ thống",
    description: "Các thông báo quan trọng về bảo trì, cập nhật phiên bản",
    type: "system",
    memberCount: 1247,
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Khuyến mãi & Sự kiện",
    description: "Thông báo ưu đãi, chương trình khuyến mãi đặc biệt",
    type: "broadcast",
    memberCount: 1247,
    createdAt: "2024-03-20",
  },
  {
    id: "3",
    name: "Nhóm VIP",
    description: "Thông báo dành riêng cho khách hàng thân thiết",
    type: "targeted",
    memberCount: 312,
    createdAt: "2024-06-10",
  },
];

export default function NotificationManagerScreen() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalChannels, setTotalChannels] = useState(0);

  // Load channels
  useEffect(() => {
    loadChannels();
  }, [searchQuery, typeFilter]);

  const loadChannels = () => {
    setIsLoading(true);
    setTimeout(() => {
      // Filter by search and type
      let filtered = mockChannels;
      if (searchQuery.trim()) {
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      if (typeFilter !== "all") {
        filtered = filtered.filter((c) => c.type === typeFilter);
      }

      setChannels(filtered);
      setTotalChannels(filtered.length);
      setIsLoading(false);
      setIsRefreshing(false);
    }, 300);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadChannels();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "system":
        return "neutral";
      case "broadcast":
        return "primary";
      case "targeted":
        return "success";
      default:
        return "neutral";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "system":
        return "Hệ thống";
      case "broadcast":
        return "Quảng bá";
      case "targeted":
        return "Mục tiêu";
      default:
        return type;
    }
  };

  const handleCreateAndSend = async (formData: any) => {
    try {
      console.log("formData",formData)
      toast.success("Tạo kênh và gửi thông báo thành công!");
      setIsCreateFormOpen(false);
      loadChannels();
    } catch {
      toast.error("Có lỗi xảy ra!");
    }
  };

  // ========== COLUMN DEFINITIONS ==========
  const columns: ColumnConfig[] = [
    {
      key: "name",
      label: "TÊN KÊNH",
      width: 250,
      cellRenderer: (rowData: NotificationChannel) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>
            {rowData.name}
          </div>
        </div>
      ),
    },
    {
      key: "description",
      label: "MÔ TẢ",
      flexGrow: 1,
      cellRenderer: (rowData: NotificationChannel) => (
        <div style={{ fontSize: "13px", color: "#6b7280" }}>
          {rowData.description || "—"}
        </div>
      ),
    },
    {
      key: "type",
      label: "LOẠI KÊNH",
      width: 150,
      cellRenderer: (rowData: NotificationChannel) => (
        <Chip variant="soft" size="sm" color={getTypeColor(rowData.type) as any}>
          {getTypeLabel(rowData.type)}
        </Chip>
      ),
    },
    {
      key: "memberCount",
      label: "THÀNH VIÊN",
      width: 130,
      cellRenderer: (rowData: NotificationChannel) => (
        <div style={{ fontSize: "13px", color: "#374151" }}>
          {rowData.memberCount.toLocaleString()}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "NGÀY TẠO",
      width: 180,
      cellRenderer: (rowData: NotificationChannel) => (
        <DateTimeCell date={rowData.createdAt} />
      ),
    },
    {
      key: "actions",
      label: "THAO TÁC",
      width: 120,
      align: "center",
      cellRenderer: (rowData: NotificationChannel) => (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
          <IconButton
            size="sm"
            variant="soft"
            sx={{
              color: "#B88A4C",
              "&:hover": { bgcolor: "#EADBC8", color: "#41301B" },
            }}
            onClick={() => setIsCreateFormOpen(true)}
          >
            <Edit size={16} />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <ManagementPage
      title="Quản lý kênh thông báo"
      subtitle={`Tổng số: ${totalChannels} kênh`}
      onCreate={() => setIsCreateFormOpen(true)}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >

      <ManagementToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm kiếm kênh..."
        // Pass specialized Search handler since this page uses debounced loading in the original code? 
        // Actually original was raw input + onBlur load. 
        // ManagementToolbar uses raw input. We can keep it simple or hook to useEffect if needed.
        // Original code: input onChange updates state, then onBlur -> loadChannels.
        // We will just let the user type, and maybe add a useEffect or keep the same behavior if possible.
        // ManagementToolbar Input onChange exposes the raw event or value? It exposes value.
        // Let's check ManagementToolbar definition. It updates state.
        
        filters={
          <Select
            placeholder="Loại kênh"
            value={typeFilter}
            onChange={(_e, value) => {
              setTypeFilter(value || "all");
              // We need to trigger load here, but setTypeFilter is async/state update.
              // In original code: onChange calls setTypeFilter AND loadChannels.
              // loadChannels reads typeFilter from state... valid closure issue?
              // Actually loadChannels reads from state `typeFilter`.
              // If we call loadChannels immediately, it might use old state.
              // Original code: onChange={(_e, value) => { setTypeFilter(value || "all"); loadChannels(); }}
              // But React state updates are batched/async.
              // The original code `loadChannels` uses `typeFilter` state variable.
              // So `loadChannels()` called immediately would see OLD state. 
              // Wait, original code:
              // useEffect(() => { loadChannels() }, []) -> distinct from onChange.
              // onChange -> setTypeFilter; loadChannels();
              // This is actually a bug in the original code if `loadChannels` relies on state variable `typeFilter`.
              // BUT `loadChannels` does `if (typeFilter !== "all")`.
              // It seems the original code might have been buggy or relied on something else.
              // However, `useEffect` or passing params is better.
              // Let's just use `useEffect` to trigger load when filters change, which is safer.
            }}
            size="sm"
            sx={MANAGEMENT_FILTER_SX}
          >
            <Option value="all">Tất cả loại</Option>
            <Option value="system">Hệ thống</Option>
            <Option value="broadcast">Quảng bá</Option>
            <Option value="targeted">Mục tiêu</Option>
          </Select>
        }
        actions={
          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1, alignItems: "center" }}>
            <IconButton
              onClick={handleRefresh}
              disabled={isRefreshing}
              sx={{
                height: 36,
                width: 36,
                bgcolor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                "&:hover": { bgcolor: "#f9fafb" },
              }}
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </IconButton>

            <Button
              startDecorator={<Plus size={16} />}
              onClick={() => setIsCreateFormOpen(true)}
              sx={{
                height: 36,
                bgcolor: "#B88A4C",
                color: "white",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: 600,
                px: 2,
                whiteSpace: "nowrap",
                transition: "all 0.2s",
                border: "1px solid #B88A4C",
                "&:hover": {
                  bgcolor: "#8C6839",
                  borderColor: "#8C6839",
                },
              }}
            >
              Tạo kênh
            </Button>
          </Box>
        }
        onAdvancedToggle={() => setIsFilterDrawerOpen(true)}
      />

      {/* Filter Drawer */}
      <Drawer
        open={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        placement="right"
        size="xs"
        className="w-[85%]! max-w-[320px]! top-[52px]! h-[calc(100%-52px)]!"
      >
        <Drawer.Header>
          <Drawer.Title>
            <span className="font-bold text-[#41301B] flex items-center gap-2">
              Bộ lọc tìm kiếm
            </span>
          </Drawer.Title>
          <Drawer.Actions>
            <Button
              variant="plain"
              size="sm"
              onClick={() => {
                setTypeFilter("all");
              }}
              sx={{ 
                color: "#B88A4C", 
                fontWeight: 600,
                "&:hover": { bgcolor: "transparent", color: "#8C6839" }
              }}
            >
              Đặt lại
            </Button>
          </Drawer.Actions>
        </Drawer.Header>
        <Drawer.Body style={{ padding: '20px' }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography level="body-sm" sx={{ mb: 1.5, fontWeight: 700, color: "#4b5563", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Loại kênh
              </Typography>
              <SelectPicker
                data={[
                  { label: "Tất cả", value: "all" },
                  { label: "Hệ thống", value: "system" },
                  { label: "Quảng bá", value: "broadcast" },
                  { label: "Mục tiêu", value: "targeted" },
                ]}
                value={typeFilter}
                onChange={(value) => setTypeFilter(value || "all")}
                searchable={false}
                cleanable={false}
                block
                placeholder="Chọn loại"
              />
            </Box>

            <Button
              fullWidth
              onClick={() => {
                setIsFilterDrawerOpen(false);
                loadChannels();
              }}
              sx={{
                height: 40,
                bgcolor: "#B88A4C",
                color: "white",
                borderRadius: "6px",
                fontWeight: 600,
                mt: 2,
                "&:hover": { bgcolor: "#8C6839" },
              }}
            >
              Áp dụng
            </Button>
          </Stack>
        </Drawer.Body>
      </Drawer>

      {/* Modern Data Table */}
      <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ModernDataTable
          data={channels}
          columns={columns}
          loading={isLoading}
          page={currentPage}
          limit={pageSize}
          total={totalChannels}
          onPageChange={setCurrentPage}
          onLimitChange={setPageSize}
          serverSidePagination={true}
          selectable
          selectedKeys={selectedChannels}
          onSelectChange={setSelectedChannels}
          rowKey={(rowData: NotificationChannel) => rowData.id}
          emptyMessage="Không có kênh thông báo nào"
        />
      </Box>



      {/* Create/Edit Form */}
      <CreateNotificationForm
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
        onSubmit={handleCreateAndSend}
      />
    </ManagementPage>
  );
}
