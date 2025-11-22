import { motion } from "framer-motion";
import { Search } from "lucide-react";
import type { FilterOption } from "../../../types/admin/common";

interface ManagementFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Array<{
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    placeholder?: string;
  }>;
  extraFilters?: React.ReactNode;
}

export function ManagementFilters({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  filters = [],
  extraFilters,
}: ManagementFiltersProps) {
  return (
    <motion.div className="p-6 border-b bg-gray-50">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>

        {/* Dynamic Filters */}
        {filters.map((filter, index) => (
          <motion.select
            key={index}
            whileFocus={{ scale: 1.02 }}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 transition-all min-w-[200px]"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </motion.select>
        ))}

        {/* Extra Filters (Custom) */}
        {extraFilters}
      </div>
    </motion.div>
  );
}
