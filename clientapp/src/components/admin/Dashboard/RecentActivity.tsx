import { MessageCircle, Users, UserPlus, Trophy } from "lucide-react";

interface Activity {
  id: string;
  type: "message" | "user" | "group" | "achievement";
  title: string;
  description: string;
  time: string;
  user?: string;
  avatar?: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "message",
    title: "Tin nhắn mới",
    description: "Người dùng Nguyễn Văn A gửi tin nhắn",
    time: "5 phút trước",
    user: "Nguyễn Văn A",
    avatar: "NA",
  },
  {
    id: "2",
    type: "user",
    title: "Người dùng mới",
    description: "Trần Thị B vừa đăng ký tài khoản",
    time: "2 giờ trước",
    user: "Trần Thị B",
    avatar: "TB",
  },
  {
    id: "3",
    type: "group",
    title: "Nhóm được tạo",
    description: 'Nhóm "Dự án 2025" vừa được tạo',
    time: "1 ngày trước",
  },
  {
    id: "4",
    type: "achievement",
    title: "Cột mốc đạt được",
    description: "Đạt 10,000 người dùng hoạt động",
    time: "3 ngày trước",
  },
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case "message":
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    case "user":
      return <UserPlus className="w-5 h-5 text-green-500" />;
    case "group":
      return <Users className="w-5 h-5 text-purple-500" />;
    case "achievement":
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    default:
      return null;
  }
};

const getActivityBgColor = (type: string) => {
  switch (type) {
    case "message":
      return "bg-blue-50";
    case "user":
      return "bg-green-50";
    case "group":
      return "bg-purple-50";
    case "achievement":
      return "bg-yellow-50";
    default:
      return "bg-gray-50";
  }
};

export default function RecentActivity() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 border border-gray-100 overflow-hidden">
      <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 line-clamp-1">
        Hoạt động gần đây
      </h3>
      <div className="space-y-2 sm:space-y-3 md:space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-2 sm:gap-3 md:gap-4 pb-2 sm:pb-3 md:pb-4 border-b border-gray-100 last:border-b-0 last:pb-0"
          >
            <div
              className={`${getActivityBgColor(
                activity.type
              )} rounded-lg p-2 sm:p-2.5 md:p-3 flex-shrink-0 flex items-center justify-center`}
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5">
                {getActivityIcon(activity.type)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-1">
                {activity.title}
              </h4>
              <p className="text-gray-600 text-xs sm:text-sm mt-1 line-clamp-2">
                {activity.description}
              </p>
              <p className="text-gray-400 text-xs mt-1 sm:mt-2">
                {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
