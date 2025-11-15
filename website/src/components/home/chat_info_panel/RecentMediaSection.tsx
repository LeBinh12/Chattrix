import { Image, Play } from "lucide-react";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  filename: string;
  timestamp: string;
}

interface RecentMediaSectionProps {
  mediaItems: MediaItem[];
  onMediaClick: (index: number) => void;
}

export default function RecentMediaSection({
  mediaItems,
  onMediaClick,
}: RecentMediaSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-blue-100 flex items-center gap-2">
          <Image size={18} />
          Ảnh/Video ({mediaItems.length})
        </h4>
        {mediaItems.length > 8 && (
          <button className="text-xs text-blue-300 hover:text-blue-200 hover:underline transition">
            Xem tất cả
          </button>
        )}
      </div>

      {mediaItems.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {mediaItems.slice(0, 8).map((media, index) => (
            <div
              key={media.id}
              onClick={() => onMediaClick(index)}
              className="relative aspect-square rounded-lg overflow-hidden bg-blue-950/50 cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-blue-400/50 transition group flex items-center justify-center border border-gray-600"
            >
              {media.type === "video" ? (
                <>
                  <div className="absolute inset-0 bg-blue-950/80 backdrop-blur-sm"></div>
                  <div className="relative z-10 flex items-center justify-center">
                    <Play size={30} className="text-blue-300" />
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
        <p className="text-xs text-blue-300/60 text-center py-4">
          Chưa có ảnh/video nào
        </p>
      )}
    </div>
  );
}
