import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Mail, UserX, CheckCircle, Trash2, UserPlus } from "lucide-react";
import { toast } from "react-toastify";
import type { Column, Action } from "../../types/admin/common";
import type { UserStatus } from "../../types/admin/user";
import { userAdminApi } from "../../api/admin/userAdminApi";
import { API_ENDPOINTS } from "../../config/api";
import { ManagementHeader } from "../../components/admin/comon/ManagementHeader";
import { ManagementFilters } from "../../components/admin/comon/ManagementFilters";
import { DataTable } from "../../components/admin/comon/DataTable";
import { Pagination } from "../../components/admin/comon/Pagination";

export default function UserManagementScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [users, setUsers] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userAdminApi.getPagination(page, limit);
      console.log("API Response:", response);
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (error) {
      console.error("Lấy dữ liệu thất bại:", error);
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Define columns for DataTable
  const columns: Column<UserStatus>[] = [
    {
      key: "user",
      label: "Người dùng",
      width: "250px",
      render: (item) => (
        <div className="flex items-center">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center bg-gray-200 text-gray-700 font-bold text-lg overflow-hidden flex-shrink-0"
          >
            {item.user.avatar && item.user.avatar !== "null" ? (
              <img
                src={`${API_ENDPOINTS.UPLOAD_MEDIA}/${item.user.avatar}`}
                alt={item.user.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              item.user.display_name?.charAt(0).toUpperCase() || "U"
            )}
          </motion.div>
          <div className="ml-4 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {item.user.display_name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              ID: {item.user.id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      label: "Liên hệ",
      width: "220px",
      render: (item) => (
        <div className="min-w-0">
          <div className="text-sm text-gray-900 font-medium truncate">
            {item.user.email}
          </div>
          <div className="text-sm text-gray-500 truncate">
            {item.user.phone}
          </div>
        </div>
      ),
    },
    {
      key: "stats",
      label: "Thống kê",
      width: "120px",
      render: (item) => (
        <div className="text-sm text-gray-900 font-medium whitespace-nowrap">
          {item.messages_count} tin nhắn
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Ngày tham gia",
      width: "140px",
      render: (item) => (
        <div className="text-sm text-gray-500 font-medium whitespace-nowrap">
          {new Date(item.user.created_at).toLocaleDateString("vi-VN")}
        </div>
      ),
    },
    {
      key: "status",
      label: "Trạng thái",
      width: "120px",
      render: (item) => (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full whitespace-nowrap ${
            item.status === "online"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {item.status === "online" ? "Online" : "Offline"}
        </motion.span>
      ),
    },
  ];

  // Define actions for DataTable
  const actions: Action<UserStatus>[] = [
    {
      icon: Eye,
      label: "Xem chi tiết",
      onClick: (user) => {
        console.log("View user:", user);
        toast.info("Tính năng đang phát triển");
      },
      color: "text-brand-600",
      hoverColor: "hover:text-brand-900",
    },
    {
      icon: Mail,
      label: "Gửi email",
      onClick: (user) => {
        console.log("Send email to:", user.user.email);
        toast.info("Tính năng đang phát triển");
      },
      color: "text-yellow-600",
      hoverColor: "hover:text-yellow-900",
    },
    {
      icon: UserX,
      label: "Khóa tài khoản",
      onClick: (user) => {
        console.log("Block user:", user);
        toast.warning("Tính năng đang phát triển");
      },
      color: "text-red-600",
      hoverColor: "hover:text-red-900",
      condition: (user) => user.status === "online",
    },
    {
      icon: CheckCircle,
      label: "Mở khóa",
      onClick: (user) => {
        console.log("Unblock user:", user);
        toast.success("Tính năng đang phát triển");
      },
      color: "text-green-600",
      hoverColor: "hover:text-green-900",
      condition: (user) => user.status === "offline",
    },
    {
      icon: Trash2,
      label: "Xóa",
      onClick: (user) => {
        if (confirm(`Bạn có chắc muốn xóa ${user.user.display_name}?`)) {
          console.log("Delete user:", user);
          toast.info("Tính năng đang phát triển");
        }
      },
      color: "text-gray-600",
      hoverColor: "hover:text-gray-900",
    },
  ];

  // Filter users
  const filteredUsers = users.filter((item) => {
    const matchesSearch =
      item.user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 p-6"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          {/* Header */}
          <ManagementHeader
            totalCount={total}
            countLabel="người dùng"
            buttonLabel="Thêm người dùng"
            onButtonClick={() => toast.info("Tính năng đang phát triển")}
            buttonIcon={UserPlus}
            gradient="from-brand-600 to-brand-700"
          />

          {/* Filters */}
          <ManagementFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Tìm kiếm theo tên, email..."
            filters={[
              {
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "online", label: "Online" },
                  { value: "offline", label: "Offline" },
                ],
              },
            ]}
          />

          {/* Table */}
          <DataTable
            data={filteredUsers}
            columns={columns}
            actions={actions}
            getItemKey={(user) => user.user.id}
            loading={loading}
            emptyMessage="Không tìm thấy người dùng nào"
            onRowClick={(user) => {
              console.log("Clicked user:", user);
              // Navigate to user detail page
            }}
          />

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            maxVisiblePages={5}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
