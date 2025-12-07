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
      title: "Tổng người dùng",
      value: allUser,
      icon: <Users className="w-6 h-6 text-blue-600" />,
      trend: allUser,
      iconBgColor: "bg-blue-100",
    },
    {
      title: "Tin nhắn hôm nay",
      value: messageToday,
      icon: <MessageSquare className="w-6 h-6 text-green-600" />,
      trend: messageToday,
      iconBgColor: "bg-green-100",
    },
    {
      title: "Người dùng hoạt động",
      value: userOnline,
      icon: <UserCheck className="w-6 h-6 text-purple-600" />,
      trend: userOnline,
      iconBgColor: "bg-purple-100",
    },
    {
      title: "Nhóm đang hoạt đông",
      value: allGroup,
      icon: <TrendingUp className="w-6 h-6 text-orange-600" />,
      trend: -2.1,
      iconBgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Padding thông minh: tăng dần theo màn hình */}
      <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20 py-6 lg:py-8">
        {/* Container tối ưu: full width đến 1920px, sau đó giữ max 1920px + padding lớn */}
        <div className="mx-auto w-full max-w-screen-2xl">
          {/* Header */}
          <DashboardHeader userName="Quản trị viên" />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <StatsCard key={index} {...stat} />
            ))}
          </div>

          {/* Charts */}
          <div className="mb-8">
            <ChartSection />
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <UserStats />
            </div>
            <div className="lg:col-span-4">
              <RecentActivity />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
