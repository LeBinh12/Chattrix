import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title = "Xác nhận",
  description = "Bạn có chắc muốn thực hiện hành động này?",
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-[#313338] rounded-xl p-6 w-[90%] max-w-md shadow-2xl border border-[#1e1f22]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <button
                onClick={onCancel}
                className="p-1.5 hover:bg-[#404249] rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-[#b5bac1] text-sm leading-relaxed mb-6">
              {description}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 rounded-lg bg-transparent text-white hover:bg-[#404249] transition-all font-medium border border-[#404249] hover:border-[#4e5058]"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="px-5 py-2.5 rounded-lg bg-[#da373c] text-white hover:bg-[#a12d30] transition-all font-medium shadow-lg"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
