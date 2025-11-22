import { useState, useMemo } from "react";
import {
  Search,
  Users,
  MoreVertical,
  Eye,
  Settings,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { mockGroups } from "../../mockups/group";

// Types
interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  avatar?: string;
  color: string;
}

// Group Card Component
// Group Card Component
const GroupCard = ({ group }: { group: Group }) => {
  const [showMenu, setShowMenu] = useState(false);
  const hasAvatar = Boolean(group.avatar);
  const navigate = useNavigate();

  return (
    <motion.div
      onClick={() => navigate("/admin/group-detail")}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ duration: 0.2 }}
      className="relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300"
    >
      {/* Header là avatar */}
      <div
        className={`relative w-full ${
          hasAvatar ? "h-36" : "h-24"
        } rounded-t-2xl overflow-hidden`}
      >
        {hasAvatar ? (
          <img
            src={group.avatar}
            alt={group.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
            <Users size={36} className="text-gray-400" />
          </div>
        )}

        {/* Menu 3 chấm */}
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-all shadow-sm"
          >
            <MoreVertical size={16} className="text-gray-700" />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10"
              >
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Eye size={14} />
                  Xem chi tiết
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Settings size={14} />
                  Cài đặt
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <Trash2 size={14} />
                  Xóa nhóm
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className={`px-6 pb-6 ${hasAvatar ? "pt-6" : "pt-4"}`}>
        <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-1">
          {group.name}
        </h3>

        {/* Members count */}
        <div className="flex items-center gap-2 text-gray-600">
          <Users size={16} className="text-gray-400" />
          <span className="text-sm font-medium">
            {group.memberCount} thành viên
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// Main Component
export default function GroupChanelManagerScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return mockGroups;

    const search = searchTerm.toLowerCase();
    return mockGroups.filter(
      (group) =>
        group.name.toLowerCase().includes(search) ||
        group.description.toLowerCase().includes(search)
    );
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm Group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
            />
          </div>
        </motion.div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Tìm thấy{" "}
            <span className="font-bold text-blue-600">
              {filteredGroups.length}
            </span>{" "}
            nhóm
          </p>
        </div>

        {/* Groups Grid */}
        <AnimatePresence mode="popLayout">
          {filteredGroups.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                <Search size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Không tìm thấy nhóm
              </h3>
              <p className="text-gray-500">Thử tìm kiếm với từ khóa khác</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
