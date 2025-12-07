import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  iconBgColor?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  trend,
  iconBgColor = "bg-blue-100",
}: StatsCardProps) {
  const isPositive = trend && trend >= 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-2 truncate">
            {title}
          </p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">
            {value}
          </p>
          {trend !== undefined && (
            <div className="flex items-center mt-2 flex-wrap gap-1">
              {isPositive ? (
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
              ) : (
                <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
              )}
              <span
                className={`text-xs sm:text-sm font-medium ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {isPositive ? "+" : ""}
                {trend}%
              </span>
              <span className="text-xs text-gray-500 hidden sm:inline">
                vs tuần trước
              </span>
            </div>
          )}
        </div>
        <div
          className={`${iconBgColor} rounded-lg p-2 sm:p-3 flex items-center justify-center flex-shrink-0`}
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6">{icon}</div>
        </div>
      </div>
    </div>
  );
}
