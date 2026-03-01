import { ChevronRight, File } from "lucide-react";
import { API_ENDPOINTS } from "../../../config/api";
import { useSetRecoilState } from "recoil";
import { activePanelAtom, storageTabAtom } from "../../../recoil/atoms/uiAtom";
// import { BUTTON_HOVER } from "../../../utils/className";

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
    const setActivePanel = useSetRecoilState(activePanelAtom);
    const setStorageTab = useSetRecoilState(storageTabAtom);
  
  return (
    <div>
      <div
        onClick={() => {
          if (fileItems.length > 0) {
            setStorageTab("files");
            setActivePanel("storage");
          }
        }}
        className="flex items-center justify-between mb-3 cursor-pointer group">
        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
          File
        </p>
        <div className="flex items-center text-gray-500 font-bold group-hover:text-gray-800 transition-colors mr-3">
          <span className="text-xs mr-1">{fileItems.length > 0 ? "Xem tất cả" : ""}</span>
          {fileItems.length > 0 ? <ChevronRight size={16} /> : ""}
          
        </div>
      </div>

      {fileItems.length > 0 ? (
        <div className="flex flex-col gap-2">
          {fileItems.slice(0, 5).map((file) => (
            <a
              key={file.id}
              href={`${API_ENDPOINTS.UPLOAD_MEDIA}/${file.url}`}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 transition border border-transparent hover:border-gray-200 !no-underline"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">
                <File size={20} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center h-10 ">
                <p className="text-sm text-gray-900 font-bold truncate">
                  {file.name}
                </p>
                <p className="text-[11px] text-gray-500">
                  {file.size} • {file.timestamp}
                </p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-500 py-2 italic bg-gray-50 rounded text-center">
          Chưa có file nào được chia sẻ
        </div>
      )}
    </div>
  );
}
