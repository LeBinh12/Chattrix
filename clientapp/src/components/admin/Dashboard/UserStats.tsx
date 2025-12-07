import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const userData = [
  { name: "Hoạt động", value: 65, color: "#3b82f6" },
  { name: "Không hoạt động", value: 25, color: "#ef4444" },
  { name: "Mới", value: 10, color: "#10b981" },
];

const userStatusData = [
  { status: "Online", count: 1234, color: "#10b981" },
  { status: "Offline", count: 2456, color: "#9ca3af" },
  { status: "Bận", count: 567, color: "#f59e0b" },
];

export default function UserStats() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
      {/* Pie Chart */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 border border-gray-100 overflow-hidden">
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 line-clamp-2">
          Trạng thái người dùng
        </h3>
        <div className="w-full h-48 sm:h-56 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={userData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={55}
                fill="#8884d8"
                dataKey="value"
              >
                {userData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Status Table */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 border border-gray-100 overflow-hidden">
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 line-clamp-2">
          Thống kê trạng thái
        </h3>
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          {userStatusData.map((item) => (
            <div
              key={item.status}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-gray-700 font-medium text-xs sm:text-sm truncate">
                  {item.status}
                </span>
              </div>
              <span className="text-gray-900 font-bold text-xs sm:text-sm md:text-base flex-shrink-0">
                {item.count}
              </span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 sm:mt-5 md:mt-6 pt-4 sm:pt-5 md:pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-xs sm:text-sm">
              Tổng người dùng
            </span>
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">
              {userStatusData.reduce((sum, item) => sum + item.count, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
