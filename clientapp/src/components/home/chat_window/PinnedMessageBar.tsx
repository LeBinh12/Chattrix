import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, ChevronDown, ChevronUp } from "lucide-react";
import type { PinnedMessageDetail } from "../../../types/pinned_message";
import { socketManager } from "../../../api/socket";

type Props = {
  pinned: PinnedMessageDetail[];
  onSelectPinned: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  currentUserId?: string;
  receiver_id?: string;
  group_id?: string;
};

export default function PinnedMessageBar({
  pinned,
  onSelectPinned,
  onUnpin,
  currentUserId,
  receiver_id,
  group_id,
}: Props) {
  const [openDropdown, setOpenDropdown] = useState(false);

  if (!pinned || pinned.length === 0) return null;

  const latest = pinned[0];

  // Strip HTML tags và truncate content
  const stripHtmlAndTruncate = (html: string, maxLength = 60) => {
    if (!html) return "";
    // Remove HTML tags
    const text = html.replace(/<[^>]*>/g, "");
    // Decode HTML entities
    const decoded = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    // Truncate
    if (decoded.length <= maxLength) return decoded;
    return decoded.substring(0, maxLength) + "...";
  };

  // Format message type display
  const getMessageTypeDisplay = (type: string) => {
    switch (type) {
      case "image":
        return "Hình ảnh";
      case "video":
        return "Video";
      case "file":
        return "File";
      case "audio":
        return "Audio";
      default:
        return "";
    }
  };

  const handleUnpin = (messageId: string, conversationId: string) => {
    socketManager.sendUnPinnedMessage(
      messageId,
      currentUserId ?? "",
      receiver_id,
      group_id,
      conversationId
    );

    // báo về parent để update UI
    onUnpin?.(messageId);
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-white border-b border-[#e4e8f1]"
    >
      <div className="px-4 py-1">
        {/* Header với Latest Message */}
        <div
          className="flex items-center justify-between gap-3 cursor-pointer group"
          onClick={() => onSelectPinned(latest.message_id)}
        >
          {/* Left side: Pin icon + Content */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Pin Icon */}
            <motion.div
              animate={{ rotate: [0, -12, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
              className="flex-shrink-0"
            >
              <div className="w-9 h-9 rounded-full bg-[#f0f3f8] flex items-center justify-center group-hover:bg-[#e4e9f2] transition-colors">
                <Pin className="w-4 h-4 text-gray-800" fill="currentColor" />
              </div>
            </motion.div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-[#6b7a8f] mb-0.5">
                Tin nhắn
              </div>
              <div className="text-[12px] text-[#1c2333] break-words line-clamp-1">
                {latest.message_type !== "text" && (
                  <span className="mr-1.5 opacity-70">
                    {getMessageTypeDisplay(latest.message_type)}
                  </span>
                )}
                <span className="font-medium text-black">
                  {latest.sender_name}:{" "}
                </span>
                {stripHtmlAndTruncate(latest.content, 80) ||
                  "Tin nhắn đã bị xóa"}{" "}
              </div>
            </div>
          </div>

          {/* Right side: Badge + Dropdown button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {pinned.length > 1 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 bg-[#f0f3f8] hover:bg-[#e4e9f2] rounded-full text-[13px] font-medium text-[#2754d7] transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown((v) => !v);
                }}
              >
                +{pinned.length - 1} ghim
                {openDropdown ? (
                  <ChevronUp className="inline ml-1 w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="inline ml-1 w-3.5 h-3.5" />
                )}
              </motion.button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUnpin(latest.message_id, latest.conversation_id);
              }}
              className="text-red-500 text-xs no-underline underline-offset-2 hover:underline hover:text-red-600 cursor-pointer"
            >
              Bỏ ghim
            </button>
          </div>
        </div>

        {/* Dropdown list */}
        <AnimatePresence>
          {openDropdown && pinned.length > 1 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 space-y-1.5 overflow-hidden"
            >
              {pinned.slice(1).map((msg, index) => (
                <motion.div
                  key={msg.pin_id}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => {
                    onSelectPinned(msg.message_id);
                    setOpenDropdown(false);
                  }}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg bg-[#f8f9fc] hover:bg-[#f0f3f8] cursor-pointer transition-colors group"
                >
                  {/* Avatar placeholder */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5a7de1] to-[#7b94eb] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-white font-semibold">
                      {msg.sender_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Message info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[13px] font-medium text-[#1c2333]">
                        {msg.sender_name}
                      </span>
                      <span className="text-[11px] text-[#8b96a5]">
                        {new Date(msg.created_at).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#5a6677] line-clamp-2 break-words">
                      {msg.message_type !== "text" && (
                        <span className="mr-1.5 opacity-70">
                          {getMessageTypeDisplay(msg.message_type)}
                        </span>
                      )}
                      {stripHtmlAndTruncate(msg.content, 80) ||
                        "Tin nhắn đã bị xóa"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
