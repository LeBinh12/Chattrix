import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";
import type {
  MonthlyUserStatResponse,
  WeeklyMessageResponse,
} from "../../../types/statistical";
import { statisticalApi } from "../../../api/statistical";

export type WeeklyChartItem = {
  name: string; // T2, T3, T4...
  personal: number; // số tin nhắn cá nhân
  group: number; // số tin nhắn nhóm
};

export type MonthlyChartItem = {
  name: string; // Tháng 1, Tháng 2...
  count: number; // số người dùng mới
};

export default function ChartSection() {
  const [chartData, setChartData] = useState<WeeklyChartItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyChartItem[]>([]);

  useEffect(() => {
    const fetchWeekly = async () => {
      const res: WeeklyMessageResponse =
        await statisticalApi.getWeeklyMessages();

      if (res.status === 200) {
        const week = res.data;

        const formatted = [
          { name: "T2", personal: week.personal.mon, group: week.group.mon },
          { name: "T3", personal: week.personal.tue, group: week.group.tue },
          { name: "T4", personal: week.personal.wed, group: week.group.wed },
          { name: "T5", personal: week.personal.thu, group: week.group.thu },
          { name: "T6", personal: week.personal.fri, group: week.group.fri },
          { name: "T7", personal: week.personal.sat, group: week.group.sat },
          { name: "CN", personal: week.personal.sun, group: week.group.sun },
        ];

        setChartData(formatted);
      }
    };

    const fetchMonthly = async () => {
      const res: MonthlyUserStatResponse =
        await statisticalApi.getMonthlyUserStat();

      if (res.status === 200) {
        const d = res.data;
        const formatted: MonthlyChartItem[] = [
          { name: "Th1", count: d.jan },
          { name: "Th2", count: d.feb },
          { name: "Th3", count: d.mar },
          { name: "Th4", count: d.apr },
          { name: "Th5", count: d.may },
          { name: "Th6", count: d.jun },
          { name: "Th7", count: d.jul },
          { name: "Th8", count: d.aug },
          { name: "Th9", count: d.sep },
          { name: "Th10", count: d.oct },
          { name: "Th11", count: d.nov },
          { name: "Th12", count: d.dec },
        ];
        setMonthlyData(formatted);
      }
    };
    fetchMonthly();
    fetchWeekly();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
      {/* Line Chart */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 border border-gray-100 overflow-hidden">
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 line-clamp-2">
          Tần suất người dùng mới trong tháng
        </h3>
        <div className="w-full h-48 sm:h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Người dùng mới"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Bar Chart */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 border border-gray-100 overflow-hidden">
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 line-clamp-2">
          Tần suất tin nhắn trong tuần
        </h3>
        <div className="w-full h-48 sm:h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />

              <Bar
                dataKey="personal"
                fill="#3b82f6"
                name="Tin nhắn cá nhân"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="group"
                fill="#10b981"
                name="Tin nhắn nhóm"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
