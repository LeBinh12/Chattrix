import { motion } from "framer-motion";

interface Props {
  filteredUsersLength: number;
  totalUsers: number;
}

export default function UserTablePagination({
  filteredUsersLength,
  totalUsers,
}: Props) {
  return (
    <motion.div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
      <div className="text-sm text-gray-700">
        Hiển thị <span className="font-bold">1</span> đến{" "}
        <span className="font-bold">{filteredUsersLength}</span> trong tổng số{" "}
        <span className="font-bold">{totalUsers}</span> kết quả
      </div>
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors"
        >
          Trước
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-lg"
        >
          1
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors"
        >
          2
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors"
        >
          3
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors"
        >
          Sau
        </motion.button>
      </div>
    </motion.div>
  );
}
