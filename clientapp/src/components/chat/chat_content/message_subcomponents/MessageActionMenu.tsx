import {
  Reply,
  Share2,
  Copy,
  Pin,
  Star,
  List,
  Info,
  Undo,
  Trash2,
  Image,
  Plus,
  ArrowRight,
  FileText,
  Bell,
  Languages,
  BookOpen,
  CheckCircle,
  Zap,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";

interface MessageActionMenuProps {
  isMine: boolean;
  isMobile: boolean;
  hasMedia: boolean;
  msgId: string;
  showFullPicker: boolean;
  onReply: () => void;
  onCopy: () => void;
  onCopyMedia: () => void;
  onDownloadAll: () => void;
  onPin: () => void;
  onStar: () => void;
  onSelectMultiple: () => void;
  onViewDetail: () => void;
  onRecall: () => void;
  onDeleteForMe: () => void;
  onReport: () => void;
  onForward: () => void;
  onQuickReaction: (emoji: string) => void;
  onEmojiClick: (emojiData: EmojiClickData) => void;
  onShowFullPicker: (show: boolean) => void;
  onClose: () => void;
  menuRef?: React.RefObject<HTMLDivElement>;
}

export default function MessageActionMenu({
  isMine,
  isMobile,
  hasMedia,
  msgId,
  showFullPicker,
  onReply,
  onCopy,
  onCopyMedia,
  onDownloadAll,
  onPin,
  onStar,
  onSelectMultiple,
  onViewDetail,
  onRecall,
  onDeleteForMe,
  onReport,
  onForward,
  onQuickReaction,
  onEmojiClick,
  onShowFullPicker,
  onClose,
  menuRef,
}: MessageActionMenuProps) {
  console.log("msgId",msgId)
  const gridActions = [
    { icon: Reply, label: "Trả lời", onClick: onReply, color: "text-purple-500" },
    { icon: ArrowRight, label: "Chuyển tiếp", onClick: onForward, color: "text-blue-500" },
    { icon: FileText, label: "Lưu Documents", onClick: () => { }, color: "text-blue-600" },
    { icon: Copy, label: "Sao chép", onClick: onCopy, color: "text-blue-500" },
    { icon: Pin, label: "Ghim", onClick: onPin, color: "text-orange-500" },
    { icon: Bell, label: "Nhắc hẹn", onClick: () => { }, color: "text-red-500" },
    { icon: CheckCircle, label: "Chọn nhiều", onClick: onSelectMultiple, color: "text-blue-600" },
    { icon: Zap, label: "Tạo tin nhắn nhanh", onClick: () => { }, color: "text-blue-400" },
    { icon: Languages, label: "Dịch", onClick: () => { }, color: "text-green-500", badge: "MỚI" },
    { icon: BookOpen, label: "Đọc văn bản", onClick: () => { }, color: "text-purple-600", badge: "MỚI" },
    { icon: Info, label: "Chi tiết", onClick: onViewDetail, color: "text-gray-500" },
    {
      icon: isMine ? Undo : Trash2,
      label: isMine ? "Thu hồi" : "Xóa",
      onClick: isMine ? onRecall : onDeleteForMe,
      color: "text-red-600",
    },
  ];

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col justify-end font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        />

        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="relative bg-[#f4f5f7] rounded-t-[24px] overflow-hidden shadow-2xl flex flex-col gap-3 p-4 pb-8"
        >
          {/* Reaction Card */}
          <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-around gap-1 relative">
            <AnimatePresence mode="wait">
              {!showFullPicker ? (
                <motion.div
                  key="quick"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex w-full items-center justify-around"
                >
                  {["❤️", "👍", "😂", "😮", "😢", "😠"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onQuickReaction(emoji)}
                      className="text-3xl hover:bg-gray-100 p-2 rounded-xl transition-transform active:scale-150"
                    >
                      {emoji}
                    </button>
                  ))}
                  <div className="w-[1px] h-8 bg-gray-100 mx-1" />
                  <button
                    onClick={() => onShowFullPicker(true)}
                    className="p-2.5 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-7 h-7 text-gray-400" />
                  </button>
                  <button className="p-2.5 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors ml-1">
                    <div className="relative">
                      <Heart className="w-7 h-7 text-gray-300" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-[2px] bg-gray-300 rotate-45" />
                    </div>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="w-full h-[400px] bg-white rounded-xl overflow-hidden"
                >
                  <div className="flex justify-between items-center px-4 py-2 border-b">
                    <span className="text-sm font-bold text-gray-700">Chọn cảm xúc</span>
                    <button onClick={() => onShowFullPicker(false)} className="p-1 hover:bg-gray-100 rounded-full">
                      <Plus className="w-5 h-5 rotate-45 text-gray-500" />
                    </button>
                  </div>
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme={Theme.LIGHT}
                    width="100%"
                    height={350}
                    previewConfig={{ showPreview: false }}
                    skinTonesDisabled
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Grid Card */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="grid grid-cols-4 gap-y-7 gap-x-1">
              {gridActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    action.onClick();
                    onClose();
                  }}
                  className="flex flex-col items-center gap-2 group active:scale-90 transition-transform"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors relative ${action.color} bg-gray-50 group-hover:bg-gray-100`}>
                    <action.icon className="w-7 h-7" />
                    {action.badge && (
                      <span className="absolute -top-1 -right-1 bg-[#42d176] text-white text-[8px] font-bold px-1 py-0.5 rounded-sm shadow-sm ring-1 ring-white">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium text-center leading-tight">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Desktop Menu
  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`absolute z-50 w-56 bg-white ${isMine ? "left-0 -translate-x-full" : "right-0 translate-x-full"
        } rounded-sm shadow-2xl overflow-hidden border border-gray-200 font-sans`}
    >
      <div className="py-1">
        <button
          onClick={() => { onReply(); onClose(); }}
          className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-gray-100 flex items-center gap-3 text-sm"
        >
          <Reply className="w-4 h-4 text-[#707b97]" />
          <span>Trả lời</span>
        </button>

        <button
          className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-gray-100 flex items-center gap-3 text-sm"
        >
          <Share2 className="w-4 h-4 text-[#707b97]" />
          <span>Chia sẻ</span>
        </button>

        <div className="h-px bg-gray-300 w-4/5 mx-auto my-1" />

        {/* <button
          onClick={() => { onCopy(); onClose(); }}
          className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-gray-100 flex items-center gap-3 text-sm"
        >
          <Copy className="w-4 h-4 text-[#707b97]" />
          <span>Copy tin nhắn</span>
        </button> */}

        {hasMedia && (
          <>
            <div className="h-px bg-gray-300 w-4/5 mx-auto my-1" />
            <button
              onClick={() => { onCopyMedia(); onClose(); }}
              className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-gray-100 flex items-center gap-3 text-sm"
            >
              {isMine ? <Copy className="w-4 h-4 text-[#707b97]" /> : <Image className="w-4 h-4 text-[#707b97]" />}
              <span>Copy ảnh</span>
            </button>
            <button
              onClick={() => { onDownloadAll(); onClose(); }}
              className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-gray-100 flex items-center gap-3 text-sm"
            >
              <Download className="w-4 h-4 text-[#707b97]" />
              <span>Tải tất cả</span>
            </button>
          </>
        )}

        <div className="h-px bg-gray-300 w-4/5 mx-auto my-1" />

        <button
          onClick={() => { onPin(); onClose(); }}
          className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-gray-100 flex items-center gap-3 text-sm"
        >
          <Pin className="w-4 h-4 text-[#707b97]" />
          <span>Ghim tin nhắn</span>
        </button>

        <button
          onClick={() => { onStar(); onClose(); }}
          className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-gray-100 flex items-center gap-3 text-sm"
        >
          <Star className="w-4 h-4 text-[#707b97]" />
          <span>Đánh dấu tin nhắn</span>
        </button>

        <button
          onClick={() => { onSelectMultiple(); onClose(); }}
          className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-gray-100 flex items-center gap-3 text-sm"
        >
          <List className="w-4 h-4 text-[#707b97]" />
          <span>Chọn nhiều tin nhắn</span>
        </button>

        <button
          onClick={() => { onViewDetail(); onClose(); }}
          className="w-full px-4 py-2.5 text-[#1f2a44] hover:bg-gray-100 flex items-center gap-3 text-sm"
        >
          <Info className="w-4 h-4 text-[#707b97]" />
          <span>Xem chi tiết</span>
        </button>

        <div className="h-px bg-gray-300 w-4/5 mx-auto my-1" />

        {isMine ? (
          <>
            <button
              onClick={() => { onRecall(); onClose(); }}
              className="w-full px-4 py-2.5 text-red-600 hover:bg-red-50 flex items-center gap-3 text-sm"
            >
              <Undo className="w-4 h-4" />
              <span>Thu hồi</span>
            </button>
            <button
              onClick={() => { onDeleteForMe(); onClose(); }}
              className="w-full px-4 py-2.5 text-red-600 hover:bg-red-50 flex items-center gap-3 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa chỉ ở phía tôi</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { onReport(); onClose(); }}
              className="w-full px-4 py-2.5 text-red-400 hover:bg-red-50 flex items-center gap-3 text-sm"
            >
              <Info className="w-4 h-4" />
              <span>Báo cáo</span>
            </button>
            <button
              onClick={() => { onDeleteForMe(); onClose(); }}
              className="w-full px-4 py-2.5 text-red-400 hover:bg-red-50 flex items-center gap-3 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa chỉ ở phía tôi</span>
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// Internal Heart Component for Mobile menu
function Heart({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
