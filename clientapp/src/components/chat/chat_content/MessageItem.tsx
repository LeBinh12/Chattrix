import {
  Check,
  CheckCheck,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Play,
  Smile,
  Trash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Messages } from "../../../types/Message";
import AvatarPreview from "./AvatarPreview";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMemo, useState } from "react";
import { API_ENDPOINTS } from "../../../config/api";
import { socketManager } from "../../../api/socket";

type StatusConfig = {
  icon: typeof Check;
  label: string;
};

type Props = {
  msg: Messages;
  index: number;
  messages: Messages[];
  currentUserId?: string;
  onPreviewMedia: (url: string) => void;
  display_name: string;
  size?: "small" | "large";
};

const statusMap: Record<string, StatusConfig> = {
  sent: { icon: Check, label: "Đã gửi" },
  delivered: { icon: CheckCheck, label: "Đã nhận" },
  received: { icon: CheckCheck, label: "Đã nhận" },
  seen: { icon: Eye, label: "Đã xem" },
};

export default function MessageItem({
  msg,
  currentUserId,
  onPreviewMedia,
  display_name,
  size = "large",
}: Props) {
  const isMine = msg.sender_id === currentUserId;
  const [isHovered, setIsHovered] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: msg.content,
    editable: false,
  });

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

  const onDeleteMessage = (messageId: string) => {
    socketManager.sendDeleteMessageForMe(currentUserId ?? "", [messageId]);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const handleReport = () => {
    alert(`Đã báo cáo tin nhắn từ ${display_name}`);
    setShowReportMenu(false);
  };

  const handleReact = () => {
    console.log("React tin nhắn:", msg.id);
  };

  if (msg.type === "system") {
    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex justify-center my-4"
      >
        <div className="px-4 py-2 rounded-full bg-white border border-[#e4e8f1] text-xs text-[#707b97] shadow-sm">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  const bubbleStyles = isMine
    ? "bg-[#dfe8ff] border-[#c5d6ff] text-[#0f3d8c]"
    : "bg-white border-[#e4e8f1] text-[#1f2a44]";

  const statusInfo =
    statusMap[(msg.status as keyof typeof statusMap) ?? "sent"] ||
    statusMap.sent;

  const renderMedia = () => {
    if (!mediaItems.length) return null;
    return (
      <div
        className={`grid gap-2 mt-3 ${
          mediaItems.length === 1 ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        {mediaItems.map((media) => {
          const mediaUrl =
            media.type === "video"
              ? `${API_ENDPOINTS.STREAM_MEDIA}/${media.id}`
              : `${API_ENDPOINTS.UPLOAD_MEDIA}/${media.url}`;
          return (
            <div
              key={media.id}
              className="relative rounded-2xl overflow-hidden bg-black/10 cursor-pointer group h-32"
              onClick={() => onPreviewMedia(mediaUrl)}
            >
              {media.type === "video" ? (
                <>
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-cover opacity-80"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <img
                  src={mediaUrl}
                  alt={media.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
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
      <div className="mt-3 space-y-2">
        {fileItems.map((file) => {
          const mediaUrl = `${API_ENDPOINTS.UPLOAD_MEDIA}/${file.url}`;
          return (
            <a
              key={file.id}
              href={mediaUrl}
              download
              className="flex items-center gap-3 p-3 rounded-2xl border border-[#dfe3ef] bg-white/70 hover:border-[#bfd1ff] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-[#e6edff] text-[#4c6fd8] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1f2a44] truncate">
                  {file.filename}
                </p>
                <p className="text-xs text-[#7e8aac]">
                  {file.size ? `${Math.round(file.size / 1024)} KB` : ""}
                </p>
              </div>
              <Download className="w-4 h-4 text-[#4c6fd8]" />
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`flex gap-2.5 ${
          isMine ? "justify-end" : "justify-start"
        } relative`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setShowReportMenu(false);
        }}
      >
        {!isMine ? (
          <AvatarPreview
            src={
              msg.sender_avatar && msg.sender_avatar !== "null"
                ? `${API_ENDPOINTS.UPLOAD_MEDIA}/${msg.sender_avatar}`
                : "/assets/logo.png"
            }
            alt={display_name}
            size={size === "small" ? 30 : 32}
          />
        ) : (
          <div className="w-7" />
        )}

        <div
          className={`flex flex-col ${
            isMine ? "items-end" : "items-start"
          } max-w-[68%] gap-1 relative`}
        >
          {/* Hover actions */}
          {!isMine && isHovered && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute -top-7 left-0 flex items-center gap-1.5 bg-white shadow border border-[#e6ebf5] px-2.5 py-1 rounded-full text-[11px]"
            >
              <button
                onClick={handleReact}
                className="text-[#5a6da8] hover:text-[#1f2a44] transition"
              >
                <Smile className="w-4 h-4" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowReportMenu((prev) => !prev)}
                  className="text-[#5a6da8] hover:text-[#1f2a44] transition"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showReportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white border border-[#e4e8f1] rounded-xl shadow-xl text-xs text-red-500"
                    >
                      <button
                        onClick={handleReport}
                        className="px-3 py-1.5 hover:bg-red-50 rounded-xl w-full text-left"
                      >
                        Báo cáo tin nhắn
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {isMine && isHovered && (
            <motion.button
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onClick={() => onDeleteMessage(msg.id)}
              className="absolute -top-7 right-0 px-2.5 py-0.5 bg-white border border-[#f0d4d4] text-[#d24c4c] rounded-full text-[11px] shadow"
            >
              Xóa <Trash className="inline w-3.5 h-3.5 ml-1" />
            </motion.button>
          )}

          <div
            className={`px-3 py-2 rounded-[20px] border shadow-sm w-fit leading-5 ${bubbleStyles} ${
              size === "small" ? "text-[12px]" : "text-[13px]"
            }`}
          >
            {msg.type !== "file" && editor && (
              <EditorContent
                editor={editor}
                className={`prose prose-sm max-w-none text-[13px] ${
                  isMine ? "text-[#0f3d8c]" : "text-[#1f2a44]"
                }`}
              />
            )}
            {renderMedia()}
            {renderFiles()}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-[#8a94b3] pl-1 pr-1">
            <span>{formatTime(msg.created_at)}</span>
            {isMine && (
              <span className="flex items-center gap-0.5">
                {statusInfo.icon && (
                  <statusInfo.icon className="w-3 h-3" />
                )}
                {statusInfo.label}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
