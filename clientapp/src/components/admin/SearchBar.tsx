// components/admin/SearchBar.tsx
import { Search, Filter } from "lucide-react";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
}

export default function SearchBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: SearchBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center">
      {/* Thanh tìm kiếm + nút Tìm kiếm */}
      <div className="flex-1 flex gap-2 items-center">
        {/* Ô tìm kiếm nhỏ gọn */}
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm theo tên đăng nhập, email,..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                       transition-all placeholder-gray-400"
          />
        </div>

        {/* Nút Tìm kiếm nhỏ */}
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all whitespace-nowrap">
          Tìm kiếm
        </button>
      </div>

      {/* Tìm kiếm nâng cao + Filter (nhỏ gọn) */}
      <div className="flex gap-2 items-center">
        {/* Nút Tìm kiếm nâng cao */}
        <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-white rounded-xl border border-blue-600 transition-all shadow-sm">
          <Search size={15} />
          Tìm kiếm nâng cao
        </button>

        {/* Bộ lọc trạng thái dạng pill nhỏ */}
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-2">
          <Filter size={15} className="text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
          >
            <option value="all">Tất cả</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>
    </div>
  );
}
