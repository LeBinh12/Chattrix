import { motion, AnimatePresence } from "framer-motion";
import type { Messages } from "../../../types/Message";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import MessageItem from "../../chat/chat_content/MessageItem";
import MediaPreview from "../../chat/chat_content/MediaPreview";

type Props = {
  display_name: string;
  currentUserId?: string;
  messages: Messages[];
  loadMoreMessages: () => void;
  isLoadingMore: boolean;
  isInitialLoading: boolean;
};

export default function ChatContentWindow({
  display_name,
  currentUserId,
  messages,
  loadMoreMessages,
  isLoadingMore,
  isInitialLoading,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());

  const allMedia = messages.flatMap((msg) =>
    (msg.media_ids || [])
      .filter((m) => m.type === "image" || m.type === "video")
      .map((m) => ({
        id: m.id,
        url: m.url,
        type: m.type as "image" | "video", // ép kiểu
        filename: m.filename || m.url,
        timestamp: msg.created_at,
      }))
  );

  const prevMessageCount = useRef(0);
  const prevDisplayName = useRef(display_name);
  const lastMessageId = useRef<string | null>(null);

  const handleScroll = async () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    setShowScrollButton(scrollTop + clientHeight < scrollHeight - 100);

    if (scrollTop < 50 && !isLoadingMore) {
      const prevScrollHeight = container.scrollHeight;
      const prevScrollTop = container.scrollTop;

      await loadMoreMessages();

      requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const newScrollHeight = containerRef.current.scrollHeight;
        containerRef.current.scrollTop =
          newScrollHeight - prevScrollHeight + prevScrollTop;
      });
    }
  };

  const scrollToBottom = () => {
    if (!containerRef.current) return;
    requestAnimationFrame(() => {
      containerRef.current!.scrollTop = containerRef.current!.scrollHeight;
      setShowScrollButton(false);
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (prevDisplayName.current !== display_name) {
      prevDisplayName.current = display_name;
      prevMessageCount.current = messages.length;
      lastMessageId.current = messages[messages.length - 1]?.id || null;
      setNewMessageIds(new Set());

      requestAnimationFrame(() => {
        if (container && messages.length > 0) {
          container.scrollTop = container.scrollHeight;
        }
      });
      return;
    }

    const currentLastMessageId = messages[messages.length - 1]?.id;
    const hasNewMessage =
      messages.length > prevMessageCount.current &&
      currentLastMessageId !== lastMessageId.current;

    if (hasNewMessage) {
      const newMessage = messages[messages.length - 1];
      const isMyMessage = newMessage?.sender_id === currentUserId;

      setNewMessageIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(currentLastMessageId!);
        return newSet;
      });

      setTimeout(() => {
        setNewMessageIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(currentLastMessageId!);
          return newSet;
        });
      }, 2000);

      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;

      if (isMyMessage || isAtBottom) {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      }

      lastMessageId.current = currentLastMessageId;
    }

    prevMessageCount.current = messages.length;
  }, [messages, display_name, currentUserId]);

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative flex-1 min-h-0 px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto bg-[#f5f7fb] scrollbar-thin scrollbar-thumb-[#cdd6eb] scrollbar-track-transparent transition-colors"
      >
        {isInitialLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-xl space-y-5 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#e1e7f5]" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-[#e6ebf7] rounded-2xl w-3/4" />
                  <div className="h-5 bg-[#e6ebf7] rounded-2xl w-2/3" />
                </div>
              </div>
              <div className="flex items-start gap-3 justify-end">
                <div className="space-y-2 flex-1 max-w-[70%]">
                  <div className="h-5 bg-[#cfdbff] rounded-2xl w-full" />
                  <div className="h-5 bg-[#cfdbff] rounded-2xl w-4/5 ml-auto" />
                </div>
                <div className="w-9 h-9 rounded-full bg-[#d6e2ff]" />
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#e1e7f5]" />
                <div className="h-5 bg-[#e6ebf7] rounded-2xl w-5/6" />
              </div>
              <div className="flex items-start gap-3 justify-end">
                <div className="space-y-2 flex-1 max-w-[65%]">
                  <div className="h-5 bg-[#cfdbff] rounded-2xl w-full" />
                  <div className="h-5 bg-[#cfdbff] rounded-2xl w-2/3 ml-auto" />
                </div>
                <div className="w-9 h-9 rounded-full bg-[#d6e2ff]" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {isLoadingMore && (
              <div className="text-center text-[#5a7de1] py-2">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="inline-flex items-center space-x-2"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full"
                  />
                  <span className="text-brand-700 font-medium">
                    Đang tải thêm...
                  </span>
                </motion.div>
              </div>
            )}

            <div className="relative space-y-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center h-full space-y-3 text-center py-16"
                  >
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="w-16 h-16 rounded-2xl bg-white border border-[#e4e8f1] shadow-inner flex items-center justify-center text-[#5a7de1]"
                    >
                      <MessageCircle size={24} />
                    </motion.div>
                    <div className="text-gray-700 text-sm font-semibold">
                      Hãy bắt đầu tin nhắn
                    </div>
                    <div className="text-gray-500 text-xs w-3/4 leading-relaxed">
                      Gửi lời chào đến {display_name} và cuộc trò chuyện sẽ xuất
                      hiện tại đây.
                    </div>
                  </motion.div>
                ) : (
                  messages.map((msg, index) => (
                    <motion.div
                      key={msg.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      {/* Hiệu ứng highlight cho tin nhắn mới */}
                      {newMessageIds.has(msg.id) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.3, 0] }}
                          transition={{ duration: 2, ease: "easeInOut" }}
                          className={`absolute inset-0 rounded-2xl pointer-events-none z-0 ${
                            msg.sender_id === currentUserId
                              ? "bg-[#bcd5ff]/40"
                              : "bg-[#d4dded]/50"
                          }`}
                        />
                      )}

                      <MessageItem
                        msg={msg}
                        index={index}
                        messages={messages}
                        currentUserId={currentUserId}
                        onPreviewMedia={setPreviewMedia}
                        display_name={display_name}
                        size="large"
                      />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            onClick={scrollToBottom}
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
            className="absolute left-1/2 -translate-x-1/2 bottom-16 sm:bottom-24 bg-white text-[#2754d7] rounded-full shadow-xl p-2 sm:p-2.5 z-20 border border-[#c7d5f6]"
          >
            <motion.div
              animate={{ y: [0, 3, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      <MediaPreview
        mediaUrl={previewMedia}
        onClose={() => setPreviewMedia(null)}
        allMedia={allMedia}
      />
    </>
  );
}
