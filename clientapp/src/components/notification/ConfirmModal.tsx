import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BUTTON_HOVER } from "../../utils/className";

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
          className="!fixed !inset-0 !z-[9999] !flex !items-center !justify-center !bg-black/40 !backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="!bg-white !rounded-sm !p-6 !w-[90%] !max-w-md !shadow-2xl !border !border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Tiêu đề + nút đóng */}
            <div className="!flex !justify-between !items-start !mb-5">
              <p className="!text-xl !font-bold !text-gray-900">{title}</p>
              <button
                onClick={onCancel}
                className={`!p-2 !rounded-lg !text-gray-500 ${BUTTON_HOVER} hover:!text-gray-700 !transition-colors`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Mô tả */}
            <p className="!text-gray-600 !text-base !leading-relaxed !mb-7">
              {description}
            </p>

            {/* Nút hành động */}
            <div className="!flex !justify-end !gap-3">
              <button
                onClick={onCancel}
                className={`!px-5 !py-2.5 !rounded-lg !text-gray-700 ${BUTTON_HOVER} !transition-all !font-medium !border !border-gray-300`}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="!px-5 !py-2.5 !rounded-lg !bg-red-600 !text-white hover:!bg-red-700 !transition-all !font-medium !shadow-md hover:!shadow-lg !cursor-pointer"
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