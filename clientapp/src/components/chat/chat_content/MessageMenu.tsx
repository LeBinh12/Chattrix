import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Download,
  Reply,
  Trash2,
  Share2,
  Pin,
  Star,
  List,
  Info,
  Undo,
  Image,
  Plus,
  MessageSquare,
  Edit2
} from "lucide-react";
import { useRef, useEffect, useState } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { Messages } from "../../../types/Message";
import UserAvatar from "../../UserAvatar";

interface MessageMenuProps {
  msg: Messages;
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  isMine: boolean;
  isMobile: boolean;
  senderName: string;
  senderAvatar?: string | null;
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onCopyMedia?: () => void;
  onDownloadAll?: () => void;
  onPin: () => void;
  onStar: () => void;
  onSelectMultiple: () => void;
  onViewDetail: () => void;
  onRecall: () => void;
  onReport: () => void;
  onDeleteForMe: () => void;
  onForward: () => void;
  onThread: () => void;
  onEdit?: () => void;
  hideThread?: boolean;
  hidePin?: boolean;
}

const QUICK_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

export default function MessageMenu({
  msg,
  showMenu,
  setShowMenu,
  isMine,
  isMobile,
  senderName,
  senderAvatar,
  onReaction,
  onReply,
  onCopy,
  onCopyMedia,
  onDownloadAll,
  onPin,
  onStar,
  onSelectMultiple,
  onViewDetail,
  onRecall,
  onReport,
  onDeleteForMe,
  onForward,
  onThread,
  onEdit,
  hideThread,
  hidePin,
}: MessageMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const hasMedia = (msg.media_ids || []).length > 0;
  console.log("onReport", onReport)
  // Detect overflow and flip direction on desktop
  useEffect(() => {
    if (showMenu && !isMobile && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;

      // If not enough space above, flip downwards
      if (spaceAbove < 0) {
        setDirection('down');
      } else {
        setDirection('up');
      }
    }
  }, [showMenu, isMobile, showFullPicker]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowFullPicker(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu, setShowMenu]);

  const handleAction = (callback: () => void) => {
    callback();
    setShowMenu(false);
  };

  const getTextContent = (html: string) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const menuItems = [
    { icon: MessageSquare, label: "Bình luận (Thread)", onClick: onThread, hidden: hideThread },
    { icon: Reply, label: "Trả lời", onClick: onReply },
    { icon: Share2, label: "Chuyển tiếp", onClick: onForward },
    // { icon: Copy, label: "Copy tin nhắn", onClick: onCopy, hidden: !msg.content },
    {
      icon: Image,
      label: "Copy ảnh",
      onClick: onCopyMedia,
      hidden: !hasMedia,
    },
    {
      icon: Download,
      label: "Tải tất cả",
      onClick: onDownloadAll,
      hidden: !hasMedia,
    },
    { icon: Pin, label: "Ghim tin nhắn", onClick: onPin, hidden: hidePin },
    // { icon: Star, label: "Đánh dấu tin nhắn", onClick: onStar },
    // { icon: List, label: "Chọn nhiều tin nhắn", onClick: onSelectMultiple },
    // { icon: Info, label: "Xem chi tiết", onClick: onViewDetail },
    {
      icon: Edit2,
      label: "Sửa tin nhắn",
      onClick: onEdit,
      hidden: !isMine || !onEdit,
      className: "text-blue-600",
    },
    {
      icon: Undo,
      label: "Thu hồi",
      onClick: onRecall,
      hidden: !isMine,
      className: "text-orange-500",
    },
    {
      icon: Trash2,
      label: "Xóa chỉ ở phía tôi",
      onClick: onDeleteForMe,
      className: "text-red-500",
    },
  ];

  return (
    <AnimatePresence>
      {showMenu && (
        <div className={`z-[110] ${isMobile
            ? "fixed inset-0 flex items-end justify-center"
            : `absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} ${isMine ? 'right-0' : 'left-0'}`
          }`}>
          {/* Backdrop only for mobile */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[-1]"
            />
          )}

          <motion.div
            ref={menuRef}
            initial={isMobile ? { opacity: 0, y: "100%" } : {
              opacity: 0,
              scale: 0.95,
              y: direction === 'up' ? 10 : -10
            }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { opacity: 0, y: "100%" } : {
              opacity: 0,
              scale: 0.95,
              y: direction === 'up' ? 10 : -10
            }}
            transition={isMobile ? { type: "spring", damping: 25, stiffness: 200 } : { duration: 0.1, ease: "easeOut" }}
            className={`
              !bg-white !overflow-hidden !flex !flex-col !relative
              ${isMobile
                ? "!w-full !rounded-t-3xl !shadow-2xl !border-t !border-white/20"
                : "!w-[240px] !rounded-sm !shadow-sm !border !border-gray-100/80"
              }
            `}
          >
            {/* Drag Handle for Mobile */}
            {isMobile && <div className="!w-12 !h-1.5 !bg-gray-300 !rounded-full !mx-auto !my-3 md:!hidden" />}

            {/* Message Preview Header */}
            <div className={`px-4 py-3 border-b border-gray-100 flex items-start gap-3 bg-gray-50/30 ${!isMobile && "hidden"}`}>
              <UserAvatar
                avatar={senderAvatar}
                display_name={senderName}
                size={36}
                showOnlineStatus={false}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{isMine ? "Bạn" : senderName}</p>
                <div className="text-sm text-gray-500 truncate leading-relaxed">
                  {msg.media_ids && msg.media_ids.length > 0 ? (
                    <span className="italic flex items-center gap-1">
                      {msg.media_ids[0].type === 'image' && <Image className="w-3 h-3" />}
                      {msg.media_ids[0].type === 'video' && <Download className="w-3 h-3" />}
                      {msg.media_ids[0].type === 'file' && <Download className="w-3 h-3" />}
                      [Phương tiện]
                    </span>
                  ) : (
                    getTextContent(msg.content)
                  )}
                </div>
              </div>
            </div>

            {/* Quick Reactions */}
            <div className={`p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 ${!isMobile && "p-2"}`}>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReaction(emoji);
                      setShowMenu(false);
                    }}
                    className={`!flex !items-center !justify-center !transition-all active:!scale-125 ${isMobile ? "!w-9 !h-9 !text-xl hover:!bg-white !rounded-full" : "!w-8 !h-8 !text-lg hover:!bg-gray-100 !rounded-md"
                      }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowFullPicker(!showFullPicker)}
                className={`!flex !items-center !justify-center !rounded-full !transition-colors ${showFullPicker ? "!bg-blue-500 !text-white" : "!bg-white !text-gray-500 hover:!bg-gray-100"
                  } ${isMobile ? "!w-9 !h-9" : "!w-8 !h-8"}`}
              >
                <Plus className={isMobile ? "!w-5 !h-5" : "!w-4 !h-4"} />
              </button>
            </div>

            {/* Menu Items */}
            {!showFullPicker ? (
              <div className={`${isMobile ? "max-h-[60vh]" : "max-h-[70vh]"} overflow-y-auto no-scrollbar py-1`}>
                {menuItems
                  .filter((item) => !item.hidden)
                  .map((item, idx) => (
                    <div key={item.label}>
                      <button
                        onClick={() => item.onClick && handleAction(item.onClick)}
                        className={`w-full flex items-center gap-3 font-medium transition-colors ${item.className || "text-gray-700"
                          } hover:bg-gray-50 active:bg-gray-100 ${isMobile ? "px-4 py-3 text-sm" : "px-3 py-2 text-[13px]"
                          }`}
                      >
                        <item.icon className={`${isMobile ? "w-4.5 h-4.5" : "w-4 h-4"} opacity-70`} />
                        <span>{item.label}</span>
                      </button>
                      {isMobile && idx < menuItems.filter(i => !i.hidden).length - 1 && (
                        <div className="h-[0.5px] bg-gray-100 mx-4" />
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-2 bg-white">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    onReaction(emojiData.emoji);
                    setShowMenu(false);
                  }}
                  autoFocusSearch={false}
                  theme={Theme.LIGHT}
                  width="100%"
                  height={isMobile ? 350 : 300}
                  lazyLoadEmojis={true}
                  skinTonesDisabled
                  searchPlaceHolder="Tìm icon..."
                  previewConfig={{
                    showPreview: false,
                  }}
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
