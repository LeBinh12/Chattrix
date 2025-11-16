import { ArrowLeftCircle, Info, Phone, Video } from "lucide-react";
import { motion } from "framer-motion";
import TimeAgo from "react-timeago";
import vi from "react-timeago/lib/language-strings/vi";
import buildFormatter from "react-timeago/lib/formatters/buildFormatter";
import { useRecoilState } from "recoil";
import { chatInfoPanelVisibleAtom } from "../../../recoil/atoms/uiAtom";
import type { ReactNode } from "react";

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
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-white border-b border-[#e4e8f1] shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {onBack && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="inline-flex mr-2 rounded-full bg-white shadow hover:shadow-md border border-[#dbe2ef] text-[#1e2b4a] transition-colors"
          >
            <ArrowLeftCircle size={26} />
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
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover mr-2 flex-shrink-0"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/assets/logo.png";
            }}
          />
        )}
        <div className="flex flex-col min-w-0">
          <h2 className="text-sm font-semibold text-[#1e2b4a]">
            {display_name}
          </h2>
          {status === "online" ? (
            <span className="text-[11px] text-emerald-500 font-medium flex items-center">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />
              Đang hoạt động
            </span>
          ) : (
            <span className="text-[11px] text-[#8e96ac]">
              Hoạt động{" "}
              <TimeAgo date={update_at ?? new Date()} formatter={formatter} />
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-end w-full sm:w-auto">
        <HeaderAction icon={<Phone size={15} />} label="Gọi thoại" className="hidden sm:flex" />
        <HeaderAction icon={<Video size={15} />} label="Gọi video" className="hidden sm:flex" />
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setPanelVisible(!isPanelVisible)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-[#dfe3ee] text-[#4d5a78] text-[13px] hover:bg-[#f1f4fa] transition w-full sm:w-auto justify-center"
        >
          <Info size={16} />
          <span className="font-medium">Thông tin</span>
        </motion.button>
      </div>
    </div>
  );
}

type HeaderActionProps = {
  icon: ReactNode;
  label: string;
  className?: string;
};

function HeaderAction({ icon, label, className = "" }: HeaderActionProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#dfe3ee] text-[#51608a] flex items-center justify-center bg-[#f8f9ff] hover:bg-white transition ${className}`}
      title={label}
    >
      {icon}
    </motion.button>
  );
}
