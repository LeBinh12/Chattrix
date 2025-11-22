import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface ManagementHeaderProps {
  title?: string;
  subtitle?: string;
  totalCount: number;
  countLabel: string;
  buttonLabel: string;
  onButtonClick: () => void;
  buttonIcon?: LucideIcon;
  gradient?: string;
}

export function ManagementHeader({
  title,
  subtitle,
  totalCount,
  countLabel,
  buttonLabel,
  onButtonClick,
  buttonIcon: ButtonIcon,
  gradient = "from-brand-600 to-brand-700",
}: ManagementHeaderProps) {
  return (
    <motion.div className={`p-6 border-b bg-gradient-to-r ${gradient}`}>
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="text-gray-700">
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          <p className="text-brand-100 text-sm mt-1">
            {subtitle || `Tổng số: ${totalCount} ${countLabel}`}
          </p>
        </div>
        <motion.button
          onClick={onButtonClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-white text-brand-600 rounded-lg hover:bg-brand-50 transition-colors font-semibold shadow-lg flex items-center gap-2"
        >
          {ButtonIcon && <ButtonIcon size={20} />}
          {buttonLabel}
        </motion.button>
      </div>
    </motion.div>
  );
}
