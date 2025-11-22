import { motion } from "framer-motion";

interface Props {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
}

export default function UserTablePagination({
  page,
  setPage,
  totalPages,
}: Props) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <motion.div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
      <div className="text-sm text-gray-700">
        Trang <span className="font-bold">{page}</span> /{" "}
        <span className="font-bold">{totalPages}</span>
      </div>
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className={`px-4 py-2 border-2 rounded-lg font-medium transition-colors ${
            page === 1
              ? "border-gray-200 text-gray-400 cursor-not-allowed"
              : "border-gray-300 hover:bg-gray-100"
          }`}
        >
          Trước
        </motion.button>

        {pages.map((p) => (
          <motion.button
            key={p}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPage(p)}
            className={`px-4 py-2 border-2 rounded-lg font-medium transition-colors ${
              p === page
                ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                : "border-gray-300 hover:bg-gray-100"
            }`}
          >
            {p}
          </motion.button>
        ))}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className={`px-4 py-2 border-2 rounded-lg font-medium transition-colors ${
            page === totalPages
              ? "border-gray-200 text-gray-400 cursor-not-allowed"
              : "border-gray-300 hover:bg-gray-100"
          }`}
        >
          Sau
        </motion.button>
      </div>
    </motion.div>
  );
}
