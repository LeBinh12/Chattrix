import { useState } from "react";
import { motion } from "framer-motion";
import UserManagementHeader from "../components/admin/user_management/UserManagementHeader";
import UserManagementFilters from "../components/admin/user_management/UserManagementFilters";
import UserTable from "../components/admin/user_management/UserTable";
import UserTablePagination from "../components/admin/user_management/UserTablePagination";

const users = [
  {
    id: 1,
    name: "Bình Lê",
    email: "binh.le@example.com",
    phone: "0901234567",
    status: "active",
    joinDate: "2024-01-15",
    messages: 1234,
    groups: 5,
  },
  {
    id: 2,
    name: "123123",
    email: "123123@example.com",
    phone: "0912345678",
    status: "active",
    joinDate: "2024-02-20",
    messages: 856,
    groups: 3,
  },
  {
    id: 3,
    name: "Lê Bình",
    email: "le.binh@example.com",
    phone: "0923456789",
    status: "active",
    joinDate: "2024-03-10",
    messages: 2341,
    groups: 8,
  },
  {
    id: 4,
    name: "Nhóm Anh Dev",
    email: "dev@example.com",
    phone: "0934567890",
    status: "blocked",
    joinDate: "2024-01-05",
    messages: 456,
    groups: 2,
  },
  {
    id: 5,
    name: "Lê Phước Bình",
    email: "admin@chattrix.com",
    phone: "0945678901",
    status: "active",
    joinDate: "2023-12-01",
    messages: 5678,
    groups: 12,
  },
];

export default function UserManagementScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredUsers = users.filter(
    (user) =>
      (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "all" || user.status === statusFilter)
  );

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-4">
      <UserManagementHeader totalUsers={filteredUsers.length} />
      <UserManagementFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
      <UserTable users={filteredUsers} />
      <UserTablePagination
        filteredUsersLength={filteredUsers.length}
        totalUsers={users.length}
      />
    </motion.div>
  );
}
