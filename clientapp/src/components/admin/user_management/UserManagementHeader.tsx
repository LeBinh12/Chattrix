import { motion } from "framer-motion";

interface Props {
  totalUsers: number;
}

export default function UserManagementHeader({ totalUsers }: Props) {
  return (
    <motion.div className="p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="text-white">
          <h2 className="text-2xl font-bold">Quản lý người dùng</h2>
          <p className="text-blue-100 text-sm mt-1">
            Tổng số: {totalUsers} người dùng
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-lg"
        >
          + Thêm người dùng
        </motion.button>
      </div>
    </motion.div>
  );
}
