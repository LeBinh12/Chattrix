import React from "react";

type DashboardCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor?: string;
  textColor?: string;
};

export default function DashboardCard({
  label,
  value,
  icon,
  bgColor = "bg-gray-50",
  textColor = "text-gray-600",
}: DashboardCardProps) {
  return (
    <div className={`${bgColor} p-4 rounded-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">{label}</p>
          <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}
