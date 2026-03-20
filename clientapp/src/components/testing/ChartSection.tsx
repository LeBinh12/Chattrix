import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface ChartSectionProps {
  title: string;
  data: any[];
  xDataKey: string;
  yDataKey: string;
  yAxisLabel?: string;
  lineColor?: string;
  areaColor?: string;
  unit?: string;
}

/**
 * ChartSection Component
 * Renders a specialized AreaChart using Recharts to display performance data.
 * Designed with a clean, professional aesthetic fitting for a performance report.
 */
const ChartSection: React.FC<ChartSectionProps> = ({
  title,
  data,
  xDataKey,
  yDataKey,
  yAxisLabel = '',
  lineColor = '#3b82f6', // Tailwind blue-500
  areaColor = '#eff6ff', // Tailwind blue-50
  unit = '',
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 overflow-hidden font-roboto">
      <h3 className="text-xl font-semibold text-gray-800 mb-6">{title}</h3>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`gradient-${yDataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey={xDataKey} 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              dy={10}
              label={{ value: 'Concurrent Users', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              dx={-10}
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
            />
            <Legend verticalAlign="top" height={36} align="right" iconType="circle" />
            <Area
              name={title.split(' vs ')[1] || title}
              type="monotone"
              dataKey={yDataKey}
              stroke={lineColor}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#gradient-${yDataKey})`}
              activeDot={{ r: 6, strokeWidth: 0 }}
              unit={unit}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartSection;
