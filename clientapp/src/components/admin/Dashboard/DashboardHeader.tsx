import { Download, ChevronDown } from "lucide-react";
import { statisticalApi } from "../../../api/statistical";
import { Dropdown } from "rsuite";

interface DashboardHeaderProps {
  userName?: string;
  period?: string;
}

export default function DashboardHeader({
  userName = "Admin",
}: DashboardHeaderProps) {
  const handleExportStats = async () => {
    await statisticalApi.downloadExcelReport();
  };

  const handleExportUsers = async () => {
    await statisticalApi.downloadUserExcelReport();
  };

  const renderToggle = (props: any) => (
    <button
      {...props}
      className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#00568c] text-white rounded-sm hover:bg-[#004470] transition-colors font-medium text-xs sm:text-sm w-full sm:w-auto cursor-pointer"
    >
      <Download className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-white" />
      <span className="text-white">Xuất báo cáo</span>
      <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-white" />
    </button>
  );

  return (
    <div className="bg-white rounded-sm shadow-sm p-2 sm:p-3 md:p-4 border border-gray-100 mb-2 sm:mb-3 md:mb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-tooltip  justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">
            Thống kê
          </p>
          <p className="text-gray-600 text-xs sm:text-sm mt-0.5">
            Chào mừng trở lại, {userName}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Dropdown renderToggle={renderToggle} placement="bottomEnd">
            <Dropdown.Item onClick={handleExportStats}>
              Thống kê tổng quan
            </Dropdown.Item>
            <Dropdown.Item onClick={handleExportUsers}>
              Danh sách người dùng
            </Dropdown.Item>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
