import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  description?: string;
  color?: string;
}

/**
 * SummaryCard Component
 * Displays a single metric with a title, value, unit, and optional icon.
 * Designed with a modern, glassmorphism-inspired look.
 */
const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  unit = '', 
  icon, 
  description,
  color = 'blue'
}) => {
  // Map color names to Tailwind CSS classes
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    green: 'text-green-600 bg-green-50 border-green-100',
    red: 'text-red-600 bg-red-50 border-red-100',
    purple: 'text-purple-600 bg-purple-50 border-purple-100',
    orange: 'text-orange-600 bg-orange-50 border-orange-100',
  };

  const selectedColorClass = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 font-roboto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
        {icon && (
          <div className={`p-2 rounded-lg ${selectedColorClass.split(' ').slice(1).join(' ')}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {unit && <span className="ml-1 text-gray-500 font-medium">{unit}</span>}
      </div>
      {description && (
        <p className="mt-2 text-sm text-gray-400">{description}</p>
      )}
    </div>
  );
};

export default SummaryCard;
