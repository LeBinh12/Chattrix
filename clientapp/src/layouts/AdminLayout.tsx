import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: Home, path: "/admin/dashboard" },
  {
    id: "users",
    label: "Quản lý người dùng",
    icon: Users,
    path: "/admin/user-manager",
  },
  {
    id: "messages",
    label: "Quản lý tin nhắn",
    icon: MessageSquare,
    path: "/admin/messages",
  },
  {
    id: "analytics",
    label: "Thống kê",
    icon: BarChart3,
    path: "/admin/analytics",
  },
  {
    id: "moderation",
    label: "Kiểm duyệt",
    icon: Shield,
    path: "/admin/moderation",
  },
  { id: "settings", label: "Cài đặt", icon: Settings, path: "/admin/settings" },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation(); // Lấy đường dẫn hiện tại
  const navigate = useNavigate();

  const currentMenuItem =
    menuItems.find((item) => location.pathname.startsWith(item.path)) ||
    menuItems[0];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Animated Sidebar */}
      <motion.aside
        initial="open"
        animate={sidebarOpen ? "open" : "closed"}
        className="bg-white shadow-2xl relative z-10"
      >
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600">
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-xl font-bold text-white"
              >
                Chattrix Admin
              </motion.h1>
            )}
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>

        <nav className="p-4">
          <motion.ul className="space-y-2" initial="hidden" animate="visible">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <motion.li
                  onClick={() => navigate(item.path)}
                  key={item.id}
                  custom={index}
                  whileHover={{ x: 5 }}
                >
                  <motion.button
                    onClick={() => console.log(`Navigate to ${item.id}`)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <motion.div
                      animate={isActive ? { rotate: 360 } : { rotate: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon size={20} />
                    </motion.div>
                    <AnimatePresence mode="wait">
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="whitespace-nowrap font-medium"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.li>
              );
            })}
          </motion.ul>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <motion.button
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="font-medium">Đăng xuất</span>}
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Animated Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-white shadow-lg"
        >
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl font-bold text-gray-800"
              >
                {currentMenuItem.label}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm text-gray-600"
              >
                Quản lý và giám sát hệ thống Chattrix
              </motion.p>
            </div>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="relative p-2 rounded-lg hover:bg-gray-100"
              >
                <MessageSquare size={20} />
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"
                />
              </motion.button>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3 cursor-pointer"
              >
                <motion.img
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin"
                  alt="Admin"
                  className="w-10 h-10 rounded-full border-2 border-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold">Lê Phước Bình</p>
                  <p className="text-xs text-gray-600">Administrator</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
