import { motion } from "framer-motion";
import { toast } from "react-toastify";

interface Props {
  totalUsers: number;
}

export default function UserManagementHeader({ totalUsers }: Props) {
  return (
    <motion.div className="p-6 border-b bg-gradient-to-r from-brand-600 to-brand-700">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="text-gray-500">
          <p className="text-brand-100 text-sm mt-1">
            Tổng số: {totalUsers} người dùng
          </p>
        </div>
        <motion.button
          onClick={() => toast.info("Tính năng đang phát triễn")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-white text-brand-600 rounded-lg hover:bg-brand-50 transition-colors font-semibold shadow-lg"
        >
          + Thêm người dùng
        </motion.button>
      </div>
    </motion.div>
  );
}
