import { Download } from "lucide-react";
import { statisticalApi } from "../../../api/statistical";

interface DashboardHeaderProps {
  userName?: string;
  period?: string;
}

export default function DashboardHeader({
  userName = "Admin",
}: DashboardHeaderProps) {
  const handleExportExcel = async () => {
    await statisticalApi.downloadExcelReport();
  };
  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 border border-gray-100 mb-3 sm:mb-4 md:mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">
            Dashboard
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            Chào mừng trở lại, {userName}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm w-full sm:w-auto"
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Xuất báo cáo</span>
            <span className="sm:hidden">Xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
}
