import { Users, MessageSquare, Shield } from "lucide-react";
import DashboardCard from "./DashboardCard";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { statisticalApi } from "../../api/statistical";
import { motion } from "framer-motion";

export default function DashboardOverview() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await statisticalApi.getCountTodayMessage();
        if (res.status === 200) {
          setCount(res.data);
        } else {
          toast.error(`Lỗi: ${res.message}`);
        }
      } catch {
        toast.error("Lỗi API");
      } finally {
        setLoading(false);
      }
    })();
  });
  if (loading) {
    return <div>Đang tải dữ liệu....</div>;
  }
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Tổng người dùng",
            value: "1,234",
            icon: <Users className="w-8 h-8 text-blue-600" />,
            bgColor: "bg-blue-50",
            textColor: "text-blue-600",
          },
          {
            label: "Tin nhắn hôm nay",
            value: count,
            icon: <MessageSquare className="w-8 h-8 text-green-600" />,
            bgColor: "bg-green-50",
            textColor: "text-green-600",
          },
          {
            label: "Nhóm hoạt động",
            value: "89",
            icon: <Users className="w-8 h-8 text-purple-600" />,
            bgColor: "bg-purple-50",
            textColor: "text-purple-600",
          },
          {
            label: "Báo cáo chưa xử lý",
            value: "12",
            icon: <Shield className="w-8 h-8 text-orange-600" />,
            bgColor: "bg-orange-50",
            textColor: "text-orange-600",
          },
        ].map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.05 }}
          >
            <DashboardCard {...item} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
