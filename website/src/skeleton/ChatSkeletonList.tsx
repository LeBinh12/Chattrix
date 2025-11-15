import { motion } from "framer-motion";

export default function ChatSkeletonList({ count = 8 }) {
  return (
    <div className="flex flex-col gap-2 px-2 py-3">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-gray-200 shadow-sm"
        >
          {/* Avatar Skeleton */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />

          {/* Nội dung bên phải */}
          <div className="flex-1 space-y-2">
            <div className="w-3/5 h-3 rounded-md bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
            <div className="w-4/5 h-3 rounded-md bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
