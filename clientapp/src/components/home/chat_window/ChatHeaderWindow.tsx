import { ArrowLeft, Info } from "lucide-react";
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
    <div className="flex items-center justify-between p-3 sm:p-4 bg-[#1150af] text-white shadow-lg border-b border-t border-gray-400">
      <div className="flex items-center">
        {onBack && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="mr-3 p-2 rounded-full bg-blue-800/50 hover:bg-blue-700/60 backdrop-blur-sm transition-colors"
          >
            <ArrowLeft size={20} />
          </motion.button>
        )}
        {avatar && (
          <img
            src={
              avatar && avatar.trim() !== "" && avatar !== "null"
                ? `http://localhost:3000/v1/upload/media/${avatar}`
                : "/assets/logo.png"
            }
            alt={display_name}
            className="w-10 h-10 rounded-full object-cover mr-3 ring-2 ring-blue-400/50"
          />
        )}
        <div className="flex flex-col">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            {display_name}
          </h2>
          {status === "online" ? (
            <span className="text-xs sm:text-sm text-green-300 font-medium flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
              Đang hoạt động
            </span>
          ) : (
            <span className="text-xs sm:text-sm text-blue-200">
              Hoạt động{" "}
              <TimeAgo date={update_at ?? new Date()} formatter={formatter} />{" "}
              trước
            </span>
          )}
        </div>
      </div>

      {/* Nút toggle hiển thị ChatInfoPanel */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setPanelVisible(!isPanelVisible)}
        className="p-2 rounded-full bg-blue-800/50 hover:bg-blue-700/60 backdrop-blur-sm transition-colors"
      >
        <Info size={20} />
      </motion.button>
    </div>
  );
}
