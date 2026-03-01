import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { linkifyHtmlContent, linkifyUrls } from "../../../utils/urlLinkifier";

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

    // Return truncated text (which will be linkified during render)
    return text.substring(0, cutPosition);
  };

  if (!isLongMessage) {
    const linkifiedContent = linkifyHtmlContent(content);
    return (
      <div
        className="prose prose-sm max-w-none break-words"
        dangerouslySetInnerHTML={{ __html: linkifiedContent }}
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
            <div 
              className="prose prose-sm max-w-none whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: linkifyUrls(getTruncatedContent()) }}
            />

            {/* Gradient overlay */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-20 pointer-events-none ${
                isMine
                  ? "bg-gradient-to-t from-blue-50 to-transparent"
                  : "bg-gradient-to-t from-gray-50 to-transparent"
              }`}
            />

            {/* Expand button */}
            <motion.button
              onClick={() => setIsExpanded(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-2.5 flex items-center justify-center gap-2 text-[13px] font-semibold transition-all ${
                isMine
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  : "bg-gray-50 hover:bg-gray-100 text-[#1f2a44]"
              } border-t ${
                isMine ? "border-blue-100/50" : "border-gray-100"
              }`}
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
              className="prose prose-sm max-w-none whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: linkifyHtmlContent(content) }}
            />

            {/* Collapse button */}
            <motion.button
              onClick={() => setIsExpanded(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-2.5 flex items-center justify-center gap-2 text-[13px] font-semibold transition-all ${
                isMine
                   ? "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  : "bg-gray-50 hover:bg-gray-100 text-[#1f2a44]"
              } border-t ${
                isMine ? "border-blue-100/50" : "border-gray-100"
              } rounded-b-2xl`}
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
