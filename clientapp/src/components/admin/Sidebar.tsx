import { motion } from "framer-motion";
import {
  Home,
  Users,
  Settings,
  LogOut,
  Group,
  MessageCircleIcon,
  Image,
  Logs,
  BellElectric,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

interface SidebarProps {
  isCollapsed: boolean;
  setTitle: (title: string) => void;
}

const menuItems = [
  { icon: Home, label: "Dashboard Nhân sự", href: "/admin" },
  { icon: Users, label: "Quản lý người dùng", href: "/admin/user-page" },
  { icon: Group, label: "Nhóm & Kênh thoại", href: "/admin/group-manager" },
  {
    icon: MessageCircleIcon,
    label: "Giám sát trò chuyện",
    href: "/admin/settings",
  },
  { icon: Image, label: " Media & Files", href: "/admin/settings" },
  { icon: Logs, label: "Nhật ký hệ thống", href: "/admin/settings" },
  { icon: BellElectric, label: "Trung tâm thông báo", href: "/admin/settings" },
  { icon: Settings, label: "Cài đặt", href: "/admin/settings" },
];

export default function Sidebar({ isCollapsed, setTitle }: SidebarProps) {
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 256 }}
      className="bg-gradient-to-b from-blue-800 to-blue-900 text-white flex flex-col overflow-hidden"
    >
      {/* Logo */}
      <div className="p-6 flex justify-center">
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "gap-3"
          } border-b border-blue-700/50 pb-2 w-full max-w-[220px]`}
        >
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-blue-800 font-bold text-xl">C</span>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold">Trò Chuyện</h1>
              <p className="text-blue-200 text-xs">Hệ Thống Nhắn Tin</p>
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 flex flex-col items-center">
        {menuItems.map((item, i) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              onClick={() => setTitle(item.label)}
              key={i}
              to={item.href}
              className={`flex items-center rounded-lg mb-2 transition-all group w-full max-w-[220px] ${
                isActive
                  ? "bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg"
                  : "hover:bg-white/10"
              } ${isCollapsed ? "justify-center py-4" : "gap-4 px-4 py-3"}`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={20} />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 flex justify-center">
        <NavLink
          to="/logout"
          className={`flex items-center rounded-lg transition-all w-full max-w-[220px] border-t border-white/30 ${
            isCollapsed
              ? "justify-center py-4"
              : "gap-4 px-4 py-3 hover:bg-white/10"
          }`}
          title={isCollapsed ? "Đăng xuất" : undefined}
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="font-medium">Đăng xuất</span>}
        </NavLink>
      </div>
    </motion.aside>
  );
}
