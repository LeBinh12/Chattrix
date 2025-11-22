import { X, Reply, Play, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { replyMessageState } from "../../../recoil/atoms/uiAtom";
import { API_ENDPOINTS } from "../../../config/api";

export default function ReplyPreview() {
  const replyTo = useRecoilValue(replyMessageState);
  const setReplyTo = useSetRecoilState(replyMessageState);
  const getTextContent = (html: string) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const handleCancel = () => setReplyTo(null);

  const getMediaUrl = (url: string) => {
    if (!url) return "";
    // nếu media_url đã là URL đầy đủ hoặc bắt đầu bằng "/" thì trả về trực tiếp
    if (url.startsWith("http") || url.startsWith("/")) return url;
    return `${API_ENDPOINTS.UPLOAD_MEDIA}/${url}`;
  };

  return (
    <AnimatePresence>
      {replyTo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="px-2 sm:px-4 pt-3 overflow-hidden"
        >
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[#f0f4ff] border border-[#d5e0ff] relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />

            <div className="flex-1 min-w-0 pl-2">
              <div className="flex items-center gap-2 mb-1">
                <Reply className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-blue-600 truncate">
                  Trả lời {replyTo.sender}
                </span>
              </div>

              <div className="text-xs text-gray-600 line-clamp-2 break-words">
                {getTextContent(replyTo.content)}
              </div>

              {/* Media preview */}
              {replyTo.media_url && (
                <div className="flex items-center gap-2 mt-1">
                  {replyTo.type === "image" && (
                    <img
                      src={getMediaUrl(replyTo.media_url)}
                      alt="reply media"
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  {replyTo.type === "video" && (
                    <div className="w-10 h-10 relative bg-black/10 flex items-center justify-center rounded">
                      <video
                        src={getMediaUrl(replyTo.media_url)}
                        className="w-full h-full object-cover opacity-80 rounded"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                  {replyTo.type === "file" && (
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-300 text-gray-600 text-[10px] p-1 text-center rounded">
                      <FileText className="w-3 h-3 mr-1 inline-block" />
                      {replyTo.content || "File"}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleCancel}
              className="p-1 hover:bg-white/70 rounded-full transition flex-shrink-0"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
