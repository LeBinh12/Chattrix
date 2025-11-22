import { useCallback, useEffect, useState } from "react";
import SearchBar from "../../components/admin/SearchBar";
import { userAdminApi } from "../../api/admin/userAdminApi";
import { toast } from "react-toastify";
import type { UserStatus } from "../../types/admin/user";
import UserTableAg from "../../components/admin/UserTable";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [users, setUsers] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userAdminApi.getPagination(page, limit);
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải dữ liệu người dùng");
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="p-1.5 space-y-1.5">
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      <UserTableAg
        users={users}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        loading={loading}
        page={page}
        total={total}
        limit={limit}
        onPageChange={setPage}
      />
    </div>
  );
}
