import { Image, Play } from "lucide-react";
import { useSetRecoilState } from "recoil";
import { activePanelAtom } from "../../../recoil/atoms/uiAtom";

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

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[13px] font-semibold text-[#1f2a44] flex items-center gap-2">
          <Image size={18} />
          Ảnh/Video ({mediaItems.length})
        </h4>
        {mediaItems.length > 8 && (
          <button
            onClick={() => setActivePanel("storage")}
            className="text-[11px] text-[#4f6eda] no-underline hover:underline hover:text-[#1f2a44] transition cursor-pointer"
          >
            Xem tất cả
          </button>
        )}
      </div>

      {mediaItems.length > 0 ? (
        <div className="grid grid-cols-4 gap-1.5">
          {mediaItems.slice(0, 8).map((media) => (
            <div
              key={media.id}
              onClick={() => onMediaClick(media.id)}
              className="relative aspect-square rounded-2xl overflow-hidden bg-[#f0f3fb] cursor-pointer hover:ring-2 hover:ring-[#94b5ff] transition group flex items-center justify-center border border-transparent"
            >
              {media.type === "video" ? (
                <>
                  <div className="absolute inset-0 bg-black/30"></div>
                  <div className="relative z-10 flex items-center justify-center text-white">
                    <Play size={24} />
                  </div>
                </>
              ) : (
                <img
                  src={`http://localhost:3000/v1/upload/media/${media.url}`}
                  alt={media.filename}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#9ba6c4] text-center py-4">
          Chưa có ảnh/video nào
        </p>
      )}
    </div>
  );
}
