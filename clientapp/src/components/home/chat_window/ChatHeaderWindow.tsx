import { ChevronLeft, PanelLeft, Search, Video, Headphones, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TimeAgo from "react-timeago";
import vi from "react-timeago/lib/language-strings/vi";
import buildFormatter from "react-timeago/lib/formatters/buildFormatter";
import { useRecoilState } from "recoil";
import { activePanelAtom } from "../../../recoil/atoms/uiAtom";
import UserAvatar from "../../UserAvatar";
import { useState, useRef, useEffect } from "react";

const formatter = buildFormatter(vi);

type ChatHeaderWindowProps = {
  display_name: string;
  avatar?: string;
  onBack?: () => void;
  status?: string;
  update_at?: string;
  receiver_id?: string; // có thì là chat cá nhân
  group_id?: string;
  isDeleted?: boolean;
  onToggleCall?: () => void;
  isCalling?: boolean;
  isActiveCallInRoom?: boolean;
};

export default function ChatHeaderWindow({
  display_name,
  avatar,
  onBack,
  status,
  update_at,
  receiver_id,
  group_id,
  isDeleted,
  onToggleCall,
  isCalling,
  isActiveCallInRoom,
}: ChatHeaderWindowProps) {
  const [activePanel, setActivePanel] = useRecoilState(activePanelAtom);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isNeverVisited = (update_at?: string) => {
    if (!update_at) return true;

    const date = new Date(update_at);
    return date.getFullYear() <= 1;
  };

  const isJoining = !isCalling && isActiveCallInRoom;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="!flex !items-center !justify-between !gap-3 !px-3 !py-2.5 !sticky !top-0 !bg-white !border-b !border-gray-100 !z-30">
      {/* Left: Back button (mobile only) */}
      <div className="!flex !items-center !gap-2 !flex-shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="lg:!hidden !flex !items-center !justify-center !w-8 !h-8 !rounded-full !text-gray-600 hover:!bg-gray-100 !transition-colors"
            title="Quay lại"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Center: Avatar and info */}
      <div className="!flex !items-center !gap-3 !min-w-0 !flex-1">
        <UserAvatar
          avatar={avatar}
          display_name={isDeleted ? "Tài khoản đã bị xóa" : display_name}
          showOnlineStatus={false}
          size={40}
          isDeleted={isDeleted}
        />
        
        <div className="!flex !flex-col !min-w-0">
          <p className="!text-[15px] !font-bold !truncate !leading-tight !text-gray-900">
            {isDeleted ? "Tài khoản đã bị xóa" : display_name}
          </p>
          {receiver_id && !group_id && (
            <div className="!flex !items-center !mt-0.5">
              {status === "online" && !isDeleted ? (
                <span className="!text-[12px] !font-medium !text-emerald-600">
                  Đang hoạt động
                </span>
              ) : isNeverVisited(update_at) ? (
                <span className="!text-[12px] !truncate !text-gray-500">
                  Chưa truy cập
                </span>
              ) : (
                <span className="!text-[12px] !truncate !text-gray-500">
                  Truy cập <TimeAgo date={update_at!} formatter={formatter} />
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="!flex !items-center !gap-1">
        {/* Call button stays outside for quick access */}
        {/* <button
          onClick={onToggleCall}
          className={`!flex !items-center !justify-center !w-8 !h-8 !rounded-full !transition-colors !cursor-pointer 
            ${isCalling
              ? "!bg-red-500 !text-white hover:!bg-red-600"
              : isJoining
                ? "!bg-green-500 !text-white hover:!bg-green-600 !shadow-sm"
                : "!text-[#00568c] hover:!bg-blue-50"}`}
          title={isCalling ? "Kết thúc" : isJoining ? "Tham gia cuộc gọi" : "Gọi video"}
        >
          {isCalling || isJoining ? (
            <Headphones size={18} strokeWidth={2} className="!animate-pulse" />
          ) : (
            <Video size={18} strokeWidth={2} />
          )}
        </button> */}

        {/* 3-dot More Options Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`!flex !items-center !justify-center !w-8 !h-8 !rounded-full !transition-colors !cursor-pointer
              ${isMenuOpen ? "!bg-gray-100 !text-gray-900" : "!text-gray-600 hover:!bg-gray-100"}`}
            title="Thêm"
          >
            <MoreVertical size={20} strokeWidth={2} />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 overflow-hidden"
              >
                <button
                  onClick={() => {
                    setActivePanel(activePanel === "search" ? "none" : "search");
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer
                    ${activePanel === "search" ? "bg-blue-50 text-[#00568c] font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  <Search size={16} strokeWidth={2} className={activePanel === "search" ? "text-[#00568c]" : "text-gray-500"} />
                  Tìm kiếm tin nhắn
                </button>
                <button
                  onClick={() => {
                    setActivePanel(activePanel === "info" ? "none" : "info");
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer
                    ${activePanel === "info" ? "bg-blue-50 text-[#00568c] font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  <PanelLeft size={16} strokeWidth={2} className={activePanel === "info" ? "text-[#00568c]" : "text-gray-500"} />
                  Thông tin hội thoại
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
