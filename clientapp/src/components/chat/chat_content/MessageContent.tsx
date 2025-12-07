import React, { useMemo } from "react";
import { Play, Download, FileText } from "lucide-react";
import type { Messages } from "../../../types/Message";
import { API_ENDPOINTS } from "../../../config/api";

interface MessageContentProps {
  msg: Messages;
  onPreviewMedia: (url: string) => void;
  getTextContent: (html: string) => string;
}

export default React.memo(function MessageContent({
  msg,
  onPreviewMedia,
  getTextContent,
}: MessageContentProps) {
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

    let columns = 1;
    let itemHeight = "auto";

    if (mediaItems.length === 1) {
      columns = 1;
      itemHeight = "300px";
    } else if (mediaItems.length === 2) {
      columns = 2;
      itemHeight = "150px";
    } else if (mediaItems.length <= 4) {
      columns = 2;
      itemHeight = "100px";
    } else {
      columns = 3;
      itemHeight = "100px";
    }

    return (
      <div
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {mediaItems.map((media) => {
          const mediaUrl =
            media.type === "video"
              ? `${API_ENDPOINTS.STREAM_MEDIA}/${media.id}`
              : `${API_ENDPOINTS.UPLOAD_MEDIA}/${media.url}`;

          return (
            <div
              key={media.id}
              className="relative cursor-pointer rounded overflow-hidden border border-gray-200 bg-gray-50"
              style={{ height: itemHeight }}
              onClick={() => onPreviewMedia(mediaUrl)}
            >
              {media.type === "video" ? (
                <>
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-cover rounded"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <img
                  src={mediaUrl}
                  alt={media.filename}
                  className="w-full h-full object-cover rounded"
                />
              )}
            </div>
          );
        })}
        {msg.content && (
          <div className="mt-2 text-sm text-gray-800 break-words col-span-full">
            {getTextContent(msg.content)}
          </div>
        )}
      </div>
    );
  };

  const renderFiles = () => {
    if (!fileItems.length) return null;

    return (
      <div className="mt-3 space-y-2">
        {fileItems.map((file) => {
          const mediaUrl = `${API_ENDPOINTS.UPLOAD_MEDIA}/${file.url}`;
          return (
            <div
              key={file.id}
              className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-gray-50"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 text-center">
                <p className="text-sm text-blue-700 font-semibold truncate">
                  {file.filename}
                </p>
              </div>

              <a
                href={mediaUrl}
                download
                className="flex-shrink-0 text-blue-600 hover:text-blue-800"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
          );
        })}

        {msg.content && (
          <div className="mt-2 text-sm text-gray-800 break-words">
            {getTextContent(msg.content)}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderMedia()}
      {renderFiles()}
      {!mediaItems.length && !fileItems.length && msg.content && (
        <div className="text-sm break-words">{getTextContent(msg.content)}</div>
      )}
    </>
  );
});
