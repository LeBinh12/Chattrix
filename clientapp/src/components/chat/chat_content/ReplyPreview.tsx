import React from "react";
import { FileText, Play } from "lucide-react";
import { API_ENDPOINTS } from "../../../config/api";

interface ReplyPreviewProps {
  reply: {
    id: string;
    sender: string;
    content: string;
    type: string;
    media_url?: string;
  };
  onClickReply: (messageId: string) => void;
  getTextContent: (html: string) => string;
}

export default React.memo(function ReplyPreview({
  reply,
  onClickReply,
  getTextContent,
}: ReplyPreviewProps) {
  if (!reply || reply.id === "000000000000000000000000") return null;

  const hasReplyMedia = ["image", "video", "file"].includes(reply.type);

  return (
    <div
      onClick={() => onClickReply(reply.id)}
      className="mb-3 w-full cursor-pointer"
    >
      <div className="flex gap-3 p-3 rounded-lg bg-gray-100 border-l-4 border-blue-500">
        {hasReplyMedia && (
          <div className="flex-shrink-0">
            {reply.type === "image" && (
              <img
                src={`${API_ENDPOINTS.UPLOAD_MEDIA}/${reply.media_url}`}
                alt="reply"
                className="w-12 h-12 object-cover rounded"
              />
            )}

            {reply.type === "video" && (
              <div className="relative">
                <video
                  src={`${API_ENDPOINTS.UPLOAD_MEDIA}/${reply.media_url}`}
                  className="w-12 h-12 object-cover rounded"
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
              </div>
            )}

            {reply.type === "file" && (
              <div className="w-12 h-12 bg-gray-300 rounded flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
            )}
          </div>
        )}

        <div className={`flex-1 min-w-0 ${hasReplyMedia ? "" : "ml-0"}`}>
          <div className="text-sm font-semibold text-blue-600 truncate">
            {reply.sender}
          </div>

          <div className="text-sm text-gray-700 line-clamp-2 break-words">
            {reply.type === "image" && "[Hình Ảnh]"}
            {reply.type === "video" && "[Video]"}
            {reply.type === "file" && (
              <span className="text-blue-600">[File] {reply.content}</span>
            )}
            {(!reply.media_url || reply.type === "text") &&
              getTextContent(reply.content)}
          </div>
        </div>
      </div>
    </div>
  );
});
