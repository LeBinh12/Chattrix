// Topbar.tsx – nhận thêm props title và subtitle
import { Bell, Menu, X } from "lucide-react";

interface TopbarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export default function Topbar({
  isSidebarCollapsed,
  onToggleSidebar,
  title = "Dashboard",
  subtitle = "",
}: TopbarProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Nút toggle sidebar */}
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden xl:block"
          >
            {isSidebarCollapsed ? <Menu size={22} /> : <X size={22} />}
          </button>

          <div>
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>

        {/* Phần user info */}
        <div className="flex items-center gap-4">
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold">
              SU
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">Super Admin</p>
              <p className="text-xs text-gray-500">admin@dthu.edu.vn</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
