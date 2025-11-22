import type { Column } from "ag-grid-community";
import { motion, AnimatePresence } from "framer-motion";
import type { Action } from "../../../types/admin/common";

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  getItemKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  actions = [],
  getItemKey,
  onRowClick,
  emptyMessage = "Không có dữ liệu",
  loading = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto hide-scrollbar">
      <table className="w-full min-w-max">
        <thead className="bg-gray-100 border-b-2 border-gray-200">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
            {actions.length > 0 && (
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Hành động
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <AnimatePresence mode="popLayout">
            {data.map((item, index) => (
              <motion.tr
                key={getItemKey(item)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{
                  backgroundColor: "#f8fafc",
                  scale: 1.01,
                  transition: { duration: 0.2 },
                }}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4">
                    {column.render(item)}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {actions
                        .filter(
                          (action) =>
                            !action.condition || action.condition(item)
                        )
                        .map((action, actionIndex) => {
                          const Icon = action.icon;
                          return (
                            <motion.button
                              key={actionIndex}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(item);
                              }}
                              whileHover={{ scale: 1.2, rotate: 5 }}
                              whileTap={{ scale: 0.9 }}
                              className={`${action.color || "text-gray-600"} ${
                                action.hoverColor || "hover:text-gray-900"
                              } p-2 rounded-lg hover:bg-opacity-10 transition-colors`}
                              title={action.label}
                            >
                              <Icon size={18} />
                            </motion.button>
                          );
                        })}
                    </div>
                  </td>
                )}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
