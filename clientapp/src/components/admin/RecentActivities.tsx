import { AnimatePresence, motion } from "framer-motion";
import ActivityItem from "./ActivityItem";

const activities = [
  {
    user: "Bình Lê",
    action: 'đã gửi tin nhắn trong nhóm "Nhóm pets"',
    time: "2 phút trước",
  },
  {
    user: "123123",
    action: 'đã tạo nhóm mới "Nhóm Anh Dev"',
    time: "15 phút trước",
  },
  { user: "Lê Bình", action: "đã tham gia hệ thống", time: "1 giờ trước" },
  { user: "Admin", action: "đã xóa tin nhắn vi phạm", time: "2 giờ trước" },
];

export default function RecentActivities() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Hoạt động gần đây</h3>
      <div className="space-y-3">
        <AnimatePresence>
          {activities.map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{
                delay: index * 0.05,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{ scale: 1.02, backgroundColor: "#f0f9ff" }}
              className="rounded"
            >
              <ActivityItem
                user={activity.user}
                action={activity.action}
                time={activity.time}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
