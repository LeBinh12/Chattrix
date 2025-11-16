import { ChevronLeft, CircleUserRound } from "lucide-react";
import { motion } from "framer-motion";
import TimeAgo from "react-timeago";
import vi from "react-timeago/lib/language-strings/vi";
import buildFormatter from "react-timeago/lib/formatters/buildFormatter";
import { useRecoilState } from "recoil";
import { chatInfoPanelVisibleAtom } from "../../../recoil/atoms/uiAtom";

const formatter = buildFormatter(vi);

type ChatHeaderWindowProps = {
  display_name: string;
  avatar?: string;
  onBack?: () => void;
  status?: string;
  update_at?: string;
};

export default function ChatHeaderWindow({
  display_name,
  avatar,
  onBack,
  status,
  update_at,
}: ChatHeaderWindowProps) {
  const [isPanelVisible, setPanelVisible] = useRecoilState(
    chatInfoPanelVisibleAtom
  );

  return (
    <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 bg-white border-b border-[#e4e8f1] shadow-sm">
      {/* Left: Back button (mobile only) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {onBack && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full bg-[#f0f4ff] hover:bg-[#e1e9ff] border border-[#d0deff] text-[#2754d7] transition-all"
            title="Quay lại"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>

      {/* Center: Avatar and info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {avatar && (
          <img
            src={
              avatar && avatar.trim() !== "" && avatar !== "null"
                ? `http://localhost:3000/v1/upload/media/${avatar}`
                : "/assets/logo.png"
            }
            alt={display_name}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-[#e8f0ff]"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/assets/logo.png";
            }}
          />
        )}
        <div className="flex flex-col min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-[#1e2b4a] truncate">
            {display_name}
          </h2>
          {status === "online" ? (
            <span className="text-[10px] sm:text-[11px] text-emerald-500 font-medium flex items-center">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
              Đang hoạt động
            </span>
          ) : (
            <span className="text-[10px] sm:text-[11px] text-[#8e96ac] truncate">
              Hoạt động{" "}
              <TimeAgo date={update_at ?? new Date()} formatter={formatter} />
            </span>
          )}
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setPanelVisible(!isPanelVisible)}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-[#f0f4ff] hover:bg-[#e1e9ff] border border-[#d0deff] text-[#2754d7] transition-all"
          title="Thông tin"
        >
          <CircleUserRound size={18} strokeWidth={2} />
        </motion.button>
      </div>
    </div>
  );
}
