import { motion } from "framer-motion";
import { Search } from "lucide-react";

interface Props {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
}

export default function UserManagementFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}: Props) {
  return (
    <motion.div className="p-6 border-b bg-gray-50">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="text"
            placeholder="Tìm kiếm theo tên, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
        <motion.select
          whileFocus={{ scale: 1.02 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="blocked">Đã khóa</option>
        </motion.select>
      </div>
    </motion.div>
  );
}
