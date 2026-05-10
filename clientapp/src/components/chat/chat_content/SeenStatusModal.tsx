import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import UserAvatar from "../../UserAvatar";
import type { Messages, SeenUserInfo } from "../../../types/Message";

type Props = {
  show: boolean;
  onClose: () => void;
  msg: Messages;
  seenByUsers: SeenUserInfo[];
  isLoading: boolean;
  hasMore: boolean;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  formatTimestamp: (date: string) => string;
  isMobile: boolean;
};

export default function SeenStatusModal({
  show,
  onClose,
  msg,
  seenByUsers,
  isLoading,
  hasMore,
  onScroll,
  formatTimestamp,
  isMobile,
}: Props) {
  return (
    <AnimatePresence>
      {show && (
        <div className={`fixed inset-0 z-[200] ${isMobile ? "flex flex-col" : "flex items-center justify-center p-4"}`}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`relative !bg-white !shadow-2xl !border !border-gray-100 ${
              isMobile 
                ? "!w-full !h-[100dvh] !max-w-none !rounded-none !flex !flex-col !overflow-hidden" 
                : "!w-full !max-w-md !rounded-2xl !overflow-hidden"
            }`}
          >
            <div className="!px-4 !py-3 !border-b !border-gray-100 !flex !items-center !justify-between !bg-gray-50/50 !flex-shrink-0">
              <div>
                <h3 className="!text-sm !font-bold !text-gray-800">Người đã xem</h3>
                <p className="!text-[10px] !text-gray-500 !mt-0.5">{formatTimestamp(msg.created_at)}</p>
              </div>
              <button
                onClick={onClose}
                className="!p-1 !hover:bg-gray-200 !rounded-full !transition-colors"
              >
                <Plus className="!w-4 !h-4 !rotate-45 !text-gray-500" />
              </button>
            </div>
            <div 
              className={`!overflow-y-auto !py-1 !overscroll-contain ${
                isMobile 
                  ? "!flex-1 !min-h-0" 
                  : "custom-scrollbar !max-h-[500px] !min-h-[200px]"
              }`}
              style={isMobile ? { WebkitOverflowScrolling: "touch" } : {}}
              onScroll={onScroll}
            >
              {isLoading && seenByUsers.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="!w-8 !h-8 !rounded-full !bg-gray-100" />
                    <div className="!h-3 !bg-gray-100 !rounded !w-24" />
                  </div>
                ))
              ) : seenByUsers.length > 0 ? (
                <>
                  {seenByUsers.map((u) => (
                    <div key={u._id} className="!flex !items-center !gap-3 !px-4 !py-2.5 hover:!bg-gray-50 !transition-colors">
                      <UserAvatar
                        avatar={u.avatar}
                        display_name={u.display_name}
                        size={32}
                        showOnlineStatus={false}
                      />
                      <span className="!text-sm !font-medium !text-gray-700">{u.display_name}</span>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center justify-center py-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    </div>
                  )}
                </>
              ) : (
                <div className="!py-10 !text-center !text-gray-400 !text-xs">Chưa có người xem</div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
