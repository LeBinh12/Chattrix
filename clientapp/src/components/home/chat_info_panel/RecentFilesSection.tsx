import { FileText } from "lucide-react";
import { API_ENDPOINTS } from "../../../config/api";

interface FileItem {
  id?: string;
  name: string;
  size: string;
  url: string;
  timestamp: string;
}

interface RecentFilesSectionProps {
  fileItems: FileItem[];
}

export default function RecentFilesSection({
  fileItems,
}: RecentFilesSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[13px] font-semibold text-[#1f2a44] flex items-center gap-2">
          <FileText size={18} />
          File ({fileItems.length})
        </h4>
        {fileItems.length > 5 && (
          <button className="text-[11px] text-[#4f6eda] hover:text-[#1f2a44] underline transition">
            Xem tất cả
          </button>
        )}
      </div>

      {fileItems.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-[#d0d7eb]">
          {fileItems.slice(0, 5).map((file) => (
            <a
              key={file.id}
              href={`${API_ENDPOINTS.UPLOAD_MEDIA}/${file.url}`}
              download
              className="flex items-center gap-3 p-3 rounded-2xl bg-[#f5f6fb] hover:bg-white border border-transparent hover:border-[#cfd7ed] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-[#e4e8f1] flex items-center justify-center flex-shrink-0 text-[#4f6eda]">
                <FileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1f2a44] truncate">
                  {file.name}
                </p>
                <p className="text-xs text-[#7d87a4]">
                  {file.size} • {file.timestamp}
                </p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#9ba6c4] text-center py-4">
          Chưa có file
        </p>
      )}
    </div>
  );
}
