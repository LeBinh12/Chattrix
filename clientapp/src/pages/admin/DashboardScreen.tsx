import { Users, MessageSquare, UserCheck, TrendingUp } from "lucide-react";
import {
  ChartSection,
  DashboardHeader,
  RecentActivity,
  StatsCard,
  UserStats,
} from "../../components/admin/Dashboard";
import { useEffect, useState } from "react";
import type { statisticalResponse } from "../../types/statistical";
import { statisticalApi } from "../../api/statistical";

export default function DashboardScreen() {
  const [messageToday, setMessageToday] = useState(0);
  const [allUser, setAllUser] = useState(0);
  const [userOnline, setUserOnline] = useState(0);
  const [allGroup, setAllGroup] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Lấy số tin nhắn hôm nay
        const messageRes: statisticalResponse =
          await statisticalApi.getCountTodayMessage();
        if (messageRes.status === 200) setMessageToday(messageRes.data);

        // Lấy tổng số user
        const userRes: statisticalResponse =
          await statisticalApi.getCountAllUser();
        if (userRes.status === 200) setAllUser(userRes.data);

        // Lấy tổng số user online
        const onlineRes: statisticalResponse =
          await statisticalApi.getCountUserOnline();
        if (onlineRes.status === 200) setUserOnline(onlineRes.data);

        // Lấy tổng số user online
        const groupRes: statisticalResponse =
          await statisticalApi.getCountGroup();
        if (onlineRes.status === 200) setAllGroup(groupRes.data);
      } catch (error) {
        console.error("Error fetching statistical data:", error);
      }
    };

    fetchData();
  }, []);

  const stats = [
    {
      label: "Tổng người dùng",
      value: allUser,
      icon: <Users size={24} />,
      sub: "Tổng số thành viên",
      accentColor: "#2563eb",
      iconBg: "#eff6ff",
    },
    {
      label: "Tin nhắn hôm nay",
      value: messageToday,
      icon: <MessageSquare size={24} />,
      sub: "Lượt tương tác mới",
      accentColor: "#16a34a",
      iconBg: "#f0fdf4",
    },
    {
      label: "Người dùng hoạt động",
      value: userOnline,
      icon: <UserCheck size={24} />,
      sub: "Đang truy cập hệ thống",
      accentColor: "#9333ea",
      iconBg: "#faf5ff",
    },
    {
      label: "Nhóm đang hoạt động",
      value: allGroup,
      icon: <TrendingUp size={24} />,
      sub: "Cộng đồng sôi nổi",
      accentColor: "#ea580c",
      iconBg: "#fff7ed",
    },
  ];

  return (
    <div className="min-h-scree">
      {/* Padding thông minh: tăng dần theo màn hình */}
      <div className="px-1 sm:px-2 lg:px-4 py-1 lg:py-2">
        {/* Container tối ưu: full width đến 1920px, sau đó giữ max 1920px + padding lớn */}
        <div className="mx-auto w-full max-w-screen-2xl">
          {/* Header */}
          <DashboardHeader userName="Quản trị viên" />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {stats.map((stat, index) => (
              <StatsCard key={index} {...stat} />
            ))}
          </div>

          {/* Charts */}
          <div className="mb-3">
            <ChartSection />
          </div>

          {/* Bottom Section */}
          {/* <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-8">
              <UserStats />
            </div>
            <div className="lg:col-span-4">
              <RecentActivity />
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
