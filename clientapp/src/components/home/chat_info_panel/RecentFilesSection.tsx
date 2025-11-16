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
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-blue-100 flex items-center gap-2">
          <FileText size={18} />
          File ({fileItems.length})
        </h4>
        {fileItems.length > 5 && (
          <button className="text-xs text-blue-300 hover:text-blue-200 hover:underline transition">
            Xem tất cả
          </button>
        )}
      </div>

      {fileItems.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-900/20">
          {fileItems.slice(0, 5).map((file) => (
            <a
              key={file.id}
              href={`${API_ENDPOINTS.UPLOAD_MEDIA}/${file.url}`}
              download
              className="flex items-center gap-3 p-2 rounded-lg bg-blue-800/40 hover:bg-blue-700/50 cursor-pointer transition backdrop-blur-sm border border-blue-700/30"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-700/50 flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-blue-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {file.name}
                </p>
                <p className="text-xs text-blue-300">
                  {file.size} • {file.timestamp}
                </p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-xs text-blue-300/60 text-center py-4">
          Chưa có file nào
        </p>
      )}
    </div>
  );
}
