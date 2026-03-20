import React, { useMemo } from "react";
import { Play, Download, FileText, Film, Image as ImageIcon } from "lucide-react";
import type { Messages } from "../../../types/Message";
import { API_ENDPOINTS } from "../../../config/api";
import { linkifyHtmlContent } from "../../../utils/urlLinkifier";

interface MessageContentProps {
  msg: Messages;
  onPreviewMedia: (url: string) => void;
  getTextContent: (html: string) => string;
}

// All file cards use the system amber/warm tone
const getFileColor = (_filename: string): { bg: string; text: string; iconBg: string } => {
  return { bg: "bg-gray-50", text: "text-blue-600", iconBg: "bg-white border-gray-200" };
};

const MessageContent = ({
  msg,
  onPreviewMedia,
  getTextContent,
}: MessageContentProps) => {
  const mediaItems = useMemo(
    () =>
      (msg.media_ids || []).filter(
        (m) => m.type === "image" || m.type === "video"
      ),
    [msg.media_ids]
  );

  const fileItems = useMemo(
    () => (msg.media_ids || []).filter((m) => m.type === "file"),
    [msg.media_ids]
  );

  const renderMedia = () => {
    if (!mediaItems.length) return null;

    const count = mediaItems.length;

    // Layout config: consistent aspect-ratio via paddingBottom trick
    const gridCols =
      count === 1 ? "grid-cols-1" :
      count === 2 ? "grid-cols-2" :
      count === 3 ? "grid-cols-3" :
      count === 4 ? "grid-cols-2" :
      "grid-cols-3";

    // For single image, use a taller aspect; for grids use square
    const aspectClass = count === 1 ? "aspect-[4/3]" : "aspect-square";

    return (
      <div className={`mt-1 grid gap-0.5 rounded-lg overflow-hidden ${gridCols} bg-gray-200`}>
        {mediaItems.map((media, i) => {
          const mediaUrl =
            media.type === "video"
              ? `${API_ENDPOINTS.STREAM_MEDIA}/${media.id}`
              : `${API_ENDPOINTS.UPLOAD_MEDIA}/${media.url}`;

          // Special layout for 3-item: first item spans full width on top
          const spanClass = count === 3 && i === 0 ? "col-span-3" : "";
          const aspectForThree = count === 3 && i === 0 ? "aspect-[16/7]" : "aspect-square";

          return (
            <div
              key={media.id}
              className={`relative cursor-pointer rounded-md overflow-hidden group bg-gray-100 ${spanClass} ${count === 3 ? aspectForThree : aspectClass}`}
              onClick={() => onPreviewMedia(mediaUrl)}
            >
              {media.type === "video" ? (
                <>
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    muted
                    preload="metadata"
                  />
                  {/* Video overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/40 transition-colors duration-200">
                    <div className="w-9 h-9 rounded-full bg-white/85 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                      <Play className="w-3.5 h-3.5 text-gray-800 ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  {/* Video badge */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
                    <Film className="w-2.5 h-2.5 text-white" />
                    <span className="text-[9px] text-white font-medium uppercase tracking-wide">Video</span>
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={mediaUrl}
                    alt={media.filename}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow">
                      <ImageIcon className="w-3.5 h-3.5 text-gray-700" />
                    </div>
                  </div>
                  {/* Count badge on last visible item if many */}
                  {count > 6 && i === 5 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">+{count - 6}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFiles = () => {
    if (!fileItems.length) return null;

    return (
      <div className="mt-1 space-y-1">
        {fileItems.map((file) => {
          const mediaUrl = `${API_ENDPOINTS.UPLOAD_MEDIA}/${file.url}`;
          const colors = getFileColor(file.filename);
          const ext = file.filename.split(".").pop()?.toUpperCase() ?? "FILE";

          return (
            <div
              key={file.id}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg border ${colors.bg} border-[#00568c]/10 hover:border-[#00568c]/30 transition-colors duration-150 cursor-default max-w-full`}
            >
              {/* Icon block */}
              <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${colors.iconBg} flex flex-col items-center justify-center`}>
                <FileText className={`w-4 h-4 text-gray-900`} />
                <span className={`text-[7px] font-bold text-gray-900 leading-none mt-0.5`}>{ext}</span>
              </div>

              {/* Filename */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium truncate leading-snug" title={file.filename}>
                  {file.filename}
                </p>
                <p className={`text-[10px] text-gray-900 mt-0.5 uppercase tracking-wide`}>{ext}</p>
              </div>

              {/* Download button */}
              <a
                href={mediaUrl}
                download
                onClick={(e) => e.stopPropagation()}
                className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${colors.text} opacity-60 hover:opacity-100 transition-opacity`}
                title="Tải xuống"
              >
                <Download className="w-3.5 h-3.5 text-gray-900" />
              </a>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-0.5 w-fit max-w-full">
      {renderMedia()}
      {renderFiles()}
      {msg.content && (
        <div className="text-sm leading-relaxed break-words prose prose-sm max-w-none mt-0.5 text-gray-800">
          <span dangerouslySetInnerHTML={{ __html: linkifyHtmlContent(msg.content) }}></span>
          {msg.edited_at && (
            <span className="text-[10px] text-gray-400 italic ml-1">(đã chỉnh sửa)</span>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(MessageContent);
