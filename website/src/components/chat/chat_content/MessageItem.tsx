import {
  Check,
  CheckCheck,
  Eye,
  FileText,
  Download,
  Play,
  MoreVertical,
  Smile,
  Trash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Messages } from "../../../types/Message";
import AvatarPreview from "./AvatarPreview";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { API_ENDPOINTS } from "../../../config/api";
import { socketManager } from "../../../api/socket";

type Props = {
  msg: Messages;
  index: number;
  messages: Messages[];
  currentUserId?: string;
  onPreviewMedia: (url: string) => void;
  display_name: string;
  size?: "small" | "large";
};

export default function MessageItem({
  msg,
  index,
  messages,
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

  // Format thời gian
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // xóa tin nhắn
  const onDeleteMessage = (messageId: string) => {
    console.log("messageID", messageId);
    socketManager.sendDeleteMessageForMe(currentUserId ?? "", [messageId]);
  };

  // Xử lý báo cáo
  const handleReport = () => {
    // TODO: Implement report functionality
    console.log("Báo cáo tin nhắn:", msg.id);
    alert(`Đã báo cáo tin nhắn từ ${display_name}`);
    setShowReportMenu(false);
  };

  // Xử lý react emoji
  const handleReact = () => {
    // TODO: Implement emoji reaction functionality
    console.log("React tin nhắn:", msg.id);
  };

  // Tin nhắn hệ thống
  if (msg.type === "system") {
    return (
      <AnimatePresence initial={false}>
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`flex justify-center ${
            size === "small" ? "my-2" : "my-3"
          }`}
        >
          <div
            className={`bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-center shadow-sm ${
              size === "small" ? "text-xs px-3 py-1" : "text-sm"
            }`}
          >
            <span className="font-medium">{msg.content}</span>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const renderFiles = () =>
    msg.media_ids
      .filter((m) => m.type === "file")
      .map((media) => {
        const mediaUrl = `http://localhost:3000/v1/upload/media/${media.url}`;
        return (
          <div
            key={media.url}
            className={`flex flex-col sm:flex-row sm:items-center justify-between 
              bg-[#8b5cf6] text-white p-2 rounded-md shadow z-2
              ${size === "small" ? "text-xs p-1" : "text-sm"} 
              gap-2 sm:gap-0 w-full max-w-full`}
          >
            <div className="flex items-center space-x-2 w-full sm:w-auto flex-1 min-w-0">
              <FileText className="w-5 h-5 text-white flex-shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium truncate">{media.filename}</span>
                <span className="text-xs text-purple-100">
                  {Math.round(media.size / 1024)} KB
                </span>
              </div>
            </div>

            <a
              href={mediaUrl}
              download
              className="flex items-center justify-center bg-purple-700 hover:bg-purple-800 
               text-white px-2 py-1 rounded-md text-xs sm:text-sm 
               transition w-full sm:w-auto"
            >
              <Download className="w-4 h-4 text-white mr-1" />
              <span className="hidden sm:inline">Tải</span>
            </a>
          </div>
        );
      });

  const renderImagesAndVideos = () => {
    const medias = msg.media_ids.filter(
      (m) => m.type === "image" || m.type === "video"
    );
    if (!medias.length) return null;

    return (
      <div
        className={`grid gap-2 ${
          medias.length === 1 ? "grid-cols-1" : "grid-cols-2"
        } ${size === "small" ? "gap-1" : ""}`}
      >
        {medias.map((media) => {
          const mediaUrl =
            media.type === "video"
              ? `${API_ENDPOINTS.STREAM_MEDIA}/${media.id}`
              : `${API_ENDPOINTS.UPLOAD_MEDIA}/${media.url}`;

          return (
            <div
              key={media.url}
              className={`relative rounded-md overflow-hidden cursor-pointer group ${
                size === "small" ? "h-20" : "h-32"
              }`}
              onClick={() => onPreviewMedia(mediaUrl)}
            >
              {media.type === "video" ? (
                // Video thumbnail với play icon
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  {/* Video element để lấy thumbnail (không play) */}
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      className="bg-white/90 rounded-full p-3 shadow-lg"
                    >
                      <Play className="w-8 h-8 text-gray-900 fill-gray-900" />
                    </motion.div>
                  </div>
                  {/* Video duration badge (optional) */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Video
                  </div>
                </div>
              ) : (
                // Image thumbnail
                <img
                  src={mediaUrl}
                  alt={media.filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={msg.id}
        initial={{
          opacity: 0,
          y: 20,
          scale: 0.9,
          x: isMine ? 20 : -20,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          x: 0,
        }}
        exit={{
          opacity: 0,
          y: 20,
          scale: 0.9,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
          mass: 1,
        }}
        className={`flex z-2 ${size === "small" ? "mb-2" : "mb-4"} ${
          isMine ? "flex-row-reverse" : "flex-row"
        } group/message relative`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setShowReportMenu(false);
        }}
      >
        {/* Avatar */}
        <motion.div
          className="flex items-end mb-0.5"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.05,
            type: "spring",
            stiffness: 400,
            damping: 20,
          }}
        >
          <AvatarPreview
            src={
              isMine
                ? "/assets/logo.png"
                : msg.sender_avatar && msg.sender_avatar !== "null"
                ? `http://localhost:3000/v1/upload/media/${msg.sender_avatar}`
                : "/assets/logo.png"
            }
            alt={display_name}
            size={size === "small" ? 32 : 36}
            onClick={
              !isMine && msg.sender_avatar && msg.sender_avatar !== "null"
                ? () =>
                    onPreviewMedia(
                      `http://localhost:3000/v1/upload/media/${msg.sender_avatar}`
                    )
                : undefined
            }
          />
        </motion.div>

        {/* Message content */}
        <div
          className={`flex flex-col ${
            isMine ? "items-end mr-2" : "items-start ml-2"
          } relative`}
        >
          {/* Hover Actions - Tin nhắn đối phương (bên phải tin nhắn) */}
          <AnimatePresence>
            {!isMine && isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.15 }}
                className={`absolute ${
                  size === "small" ? "-top-7" : "-top-9"
                } right-0 flex items-center space-x-1.5 z-30`}
              >
                {/* Icon mặt cười */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReact}
                  className="bg-white hover:bg-gray-50 rounded-full p-1.5 shadow-lg border border-gray-200 transition-colors"
                  title="Thả cảm xúc"
                >
                  <Smile className="w-4 h-4 text-gray-600" />
                </motion.button>

                {/* Icon 3 chấm với menu báo cáo */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowReportMenu(!showReportMenu)}
                    className="bg-white hover:bg-gray-50 rounded-full p-1.5 shadow-lg border border-gray-200 transition-colors"
                    title="Tùy chọn"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </motion.button>

                  {/* Menu báo cáo */}
                  <AnimatePresence>
                    {showReportMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full mt-1.5 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[150px] z-50"
                      >
                        <button
                          onClick={handleReport}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2.5"
                        >
                          <span className="text-base">!</span>
                          <span className="font-medium">Báo cáo</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hover Time - Tin nhắn của mình (bên trái tin nhắn) */}
          <AnimatePresence>
            {isMine && isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.15 }}
                className={`absolute ${size === "small" ? "-top-6" : "-top-7"} 
      left-0 right-0 flex justify-between items-center bg-gray-800/90 backdrop-blur-sm 
      text-white text-xs px-2.5 py-1 rounded-md shadow-lg z-30`}
              >
                {/* Thời gian bên trái */}
                <span>{formatTime(msg.created_at)}</span>

                {/* Nút xóa bên phải */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onDeleteMessage(msg.id)}
                  className="flex items-center justify-center p-1 rounded-full hover:bg-red-600 transition-colors"
                  title="Xóa tin nhắn"
                >
                  <Trash className="w-4 h-4 text-red-500" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.1,
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
            className={`max-w-xs z-2 p-3 rounded-2xl shadow-md ${
              isMine
                ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-sm"
                : "bg-white text-gray-800 rounded-bl-sm"
            } ${size === "small" ? "p-2 max-w-[180px]" : ""}`}
          >
            {/* Text content */}
            {msg.type !== "file" && editor && (
              <EditorContent
                editor={editor}
                className={`prose prose-sm ${
                  isMine ? "text-white prose-invert" : "text-gray-800"
                }`}
              />
            )}

            {/* File content */}
            {msg.type === "file" && (
              <div className="flex flex-col space-y-2">
                {renderImagesAndVideos()}
                {renderFiles()}
                {msg.content && editor && (
                  <EditorContent
                    editor={editor}
                    className={`prose prose-sm ${
                      isMine ? "text-white prose-invert" : "text-gray-800"
                    }`}
                  />
                )}
              </div>
            )}
          </motion.div>

          {/* Status - chỉ hiện cho tin nhắn cuối của mình */}
          {isMine && index === messages.length - 1 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`flex items-center mt-1.5 space-x-1 text-xs rounded-full px-3 py-1 
                ${
                  msg.status === "seen"
                    ? "bg-blue-100 text-gray-700 border border-purple-200"
                    : msg.status === "delivered"
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-gray-100 text-gray-600 border border-gray-200"
                }`}
            >
              {msg.status === "sent" && (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã gửi</span>
                </>
              )}
              {msg.status === "delivered" && (
                <>
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Đã nhận</span>
                </>
              )}
              {msg.status === "seen" && (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Đã xem</span>
                </>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
