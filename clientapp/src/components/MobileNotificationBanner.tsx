import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell } from "lucide-react";

interface MobileNotificationBannerProps {
  isVisible: boolean;
  title: string;
  body: string;
  onClose: () => void;
  onClick?: () => void;
}

const MobileNotificationBanner: React.FC<MobileNotificationBannerProps> = ({
  isVisible,
  title,
  body,
  onClose,
  onClick,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-2 left-3 right-3 z-[9999] bg-[#fffbeb] dark:bg-slate-900 rounded-xl shadow-xl border border-[#fef3c7] dark:border-slate-800 overflow-hidden"
          onClick={onClick}
        >
          <div className="p-2.5 flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 bg-[#fef3c7] dark:bg-yellow-900/30 rounded-lg flex items-center justify-center text-[#966e3d] dark:text-yellow-500">
              <Bell size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {title}
              </h4>
              <p className="text-[11px] leading-tight text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                {body}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#fef3c7] dark:hover:bg-slate-700 text-slate-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="h-0.5 bg-[#966e3d] w-full origin-left animate-progress" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileNotificationBanner;
