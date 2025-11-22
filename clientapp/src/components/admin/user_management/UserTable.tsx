import { motion, AnimatePresence } from "framer-motion";
import { Eye, Mail, UserX, CheckCircle, Trash2 } from "lucide-react";
import type { UserStatus } from "../../../types/admin/user";
import { API_ENDPOINTS } from "../../../config/api";
import { toast } from "react-toastify";

interface Props {
  users: UserStatus[];
}

export default function UserTable({ users }: Props) {
  return (
    <div className="overflow-x-auto hide-scrollbar">
      <table className="w-full min-w-max">
        <thead className="bg-gray-100 border-b-2 border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
              Người dùng
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
              Liên hệ
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
              Thống kê
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
              Ngày tham gia
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
              Trạng thái
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <AnimatePresence mode="popLayout">
            {users.map((user, index) => (
              <motion.tr
                key={user.user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{
                  backgroundColor: "#f8fafc",
                  scale: 1.01,
                  transition: { duration: 0.2 },
                }}
                className="cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center bg-gray-200 text-gray-700 font-bold text-lg overflow-hidden"
                    >
                      {user.user.avatar && user.user.avatar !== "null" ? (
                        <img
                          src={`${API_ENDPOINTS.UPLOAD_MEDIA}/${user.user.avatar}`}
                          alt={user.user.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user.user.display_name?.charAt(0).toUpperCase() || "U"
                      )}
                    </motion.div>

                    <div className="ml-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {user.user.display_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {user.user.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 font-medium">
                    {user.user.email}
                  </div>
                  <div className="text-sm text-gray-500">{user.user.phone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 font-medium">
                    {user.messages_count} tin nhắn
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                  {new Date(user.user.created_at).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                      user.status === "online"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.status === "online" ? "Online" : "Offline"}
                  </motion.span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => toast.info("Tính năng đang phát triễn")}
                      whileHover={{ scale: 1.2, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-brand-600 hover:text-brand-900 p-2 rounded-lg hover:bg-brand-50 transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </motion.button>
                    <motion.button
                      onClick={() => toast.info("Tính năng đang phát triễn")}
                      whileHover={{ scale: 1.2, rotate: -5 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-yellow-600 hover:text-yellow-900 p-2 rounded-lg hover:bg-yellow-50 transition-colors"
                      title="Gửi email"
                    >
                      <Mail size={18} />
                    </motion.button>
                    <motion.button
                      onClick={() => toast.info("Tính năng đang phát triễn")}
                      whileHover={{ scale: 1.2, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                      className={`${
                        user.status === "active"
                          ? "text-red-600 hover:text-red-900 hover:bg-red-50"
                          : "text-green-600 hover:text-green-900 hover:bg-green-50"
                      } p-2 rounded-lg transition-colors`}
                      title={
                        user.status === "active" ? "Khóa tài khoản" : "Mở khóa"
                      }
                    >
                      {user.status === "active" ? (
                        <UserX size={18} />
                      ) : (
                        <CheckCircle size={18} />
                      )}
                    </motion.button>
                    <motion.button
                      onClick={() => toast.info("Tính năng đang phát triễn")}
                      whileHover={{ scale: 1.2, rotate: -5 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
