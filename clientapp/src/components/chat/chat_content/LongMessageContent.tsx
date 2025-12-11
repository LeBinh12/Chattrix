import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  content: string;
  isMine: boolean;
  maxLength?: number;
};

export default function LongMessageContent({
  content,
  isMine,
  maxLength = 1000,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Hàm loại bỏ HTML tags để đếm text thuần
  const getTextContent = (html: string) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const textContent = getTextContent(content);
  const isLongMessage = textContent.length > maxLength;

  // Tách content thành các đoạn
  const getTruncatedContent = () => {
    if (!isLongMessage) return content;

    const temp = document.createElement("div");
    temp.innerHTML = content;
    const text = temp.textContent || "";

    // Tìm vị trí ngắt hợp lý (tại dấu xuống dòng hoặc dấu chấm)
    let cutPosition = maxLength;
    const nearestLineBreak = text.lastIndexOf("\n", maxLength);
    const nearestPeriod = text.lastIndexOf(".", maxLength);

    if (nearestLineBreak > maxLength * 0.7) {
      cutPosition = nearestLineBreak;
    } else if (nearestPeriod > maxLength * 0.7) {
      cutPosition = nearestPeriod + 1;
    }

    return text.substring(0, cutPosition);
  };

  if (!isLongMessage) {
    return (
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="truncated"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {getTruncatedContent()}
            </div>

            {/* Gradient overlay */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-20 pointer-events-none ${
                isMine
                  ? "bg-gradient-to-t from-[#dfe8ff] to-transparent"
                  : "bg-gradient-to-t from-white to-transparent"
              }`}
            />

            {/* Expand button */}
            <motion.button
              onClick={() => setIsExpanded(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                mt-2 w-full py-2 px-3 rounded-lg
                flex items-center justify-center gap-2
                text-sm font-medium transition-colors
                ${
                  isMine
                    ? "bg-[#c5d6ff] hover:bg-[#b5c9ff] text-[#0f3d8c]"
                    : "bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#1f2a44]"
                }
              `}
            >
              <span>Xem thêm</span>
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="prose prose-sm max-w-none whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* Collapse button */}
            <motion.button
              onClick={() => setIsExpanded(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                mt-2 w-full py-2 px-3 rounded-lg
                flex items-center justify-center gap-2
                text-sm font-medium transition-colors
                ${
                  isMine
                    ? "bg-[#c5d6ff] hover:bg-[#b5c9ff] text-[#0f3d8c]"
                    : "bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#1f2a44]"
                }
              `}
            >
              <span>Thu gọn</span>
              <ChevronUp className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
