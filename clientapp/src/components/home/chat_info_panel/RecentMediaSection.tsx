import { Play, ChevronRight } from "lucide-react";
import { useSetRecoilState } from "recoil";
import { activePanelAtom, storageTabAtom } from "../../../recoil/atoms/uiAtom";
import { API_ENDPOINTS } from "../../../config/api";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  filename: string;
  timestamp: string;
}

interface RecentMediaSectionProps {
  mediaItems: MediaItem[];
  onMediaClick: (index: string) => void;
}

export default function RecentMediaSection({
  mediaItems,
  onMediaClick,
}: RecentMediaSectionProps) {
  const setActivePanel = useSetRecoilState(activePanelAtom);
  const setStorageTab = useSetRecoilState(storageTabAtom);

  return (
    <div>
      <div
        className="flex items-center justify-between mb-3 cursor-pointer group"
        onClick={() => {
          if (mediaItems.length > 0) {
            setStorageTab("media");
            setActivePanel("storage");
          }
        }}
      >
        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
          Ảnh/Video
        </p>
        {/* Only show 'See all' logic if items exist, or just show arrow like Zalo */}
        <div className="flex items-center text-gray-500 font-bold group-hover:text-gray-800 transition-colors mr-3">
          <span className="text-xs mr-1">{mediaItems.length > 0 ? "Xem tất cả" : ""}</span>
          <ChevronRight size={16} />
        </div>
      </div>

      {mediaItems.length > 0 ? (
        <div className="grid grid-cols-4 gap-1">
          {mediaItems.slice(0, 8).map((media) => (
            <div
              key={media.id}
              onClick={() => onMediaClick(media.id)}
              className="relative aspect-square rounded-md overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition border border-gray-100"
            >
              {media.type === "video" ? (
                <>
                  <div className="absolute inset-0 bg-black/30"></div>
                  <div className="absolute inset-0 z-10 flex items-center justify-center text-white">
                    <Play size={20} />
                  </div>
                </>
              ) : (
                <img
                  src={`${API_ENDPOINTS.STREAM_MEDIA}/${media.id}`}
                  alt={media.filename}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-500 py-2 italic bg-gray-50 rounded text-center">
          Chưa có ảnh/video được chia sẻ
        </div>
      )}
    </div>
  );
}
