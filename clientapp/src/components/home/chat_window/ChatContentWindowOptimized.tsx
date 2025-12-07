import { motion, AnimatePresence } from "framer-motion";
import type { Messages } from "../../../types/Message";
import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import MessageItemOptimized from "../../chat/chat_content/MessageItemOptimized";
import MediaPreview from "../../chat/chat_content/MediaPreview";

type Props = {
  display_name: string;
  currentUserId?: string;
  messages: Messages[];
  loadMoreMessages: () => void;
  isLoadingMore: boolean;
  isInitialLoading: boolean;
  highlightMessageId?: string | null;
  onClearHighlight?: () => void;
};

export default function ChatContentWindowOptimized({
  display_name,
  currentUserId,
  messages,
  loadMoreMessages,
  isLoadingMore,
  isInitialLoading,
  highlightMessageId,
  onClearHighlight,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const prevMessageCountRef = useRef(0);
  const scrollBehaviorRef = useRef<"auto" | "loadmore">("auto");
  const loadMoreScrollPositionRef = useRef<number>(0);

  const allMedia = messages.flatMap((msg) =>
    (msg.media_ids || [])
      .filter((m) => m.type === "image" || m.type === "video")
      .map((m) => ({
        id: m.id,
        url: m.url,
        type: m.type as "image" | "video",
        filename: m.filename || m.url,
        timestamp: msg.created_at,
      }))
  );

  const scrollToBottom = useCallback((smooth = false) => {
    const container = containerRef.current;
    if (!container) return;

    if (smooth) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    } else {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 50);
    }
    setShowScrollButton(false);
  }, []);

  const handleScroll = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    const shouldShowButton = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollButton(shouldShowButton);

    if (
      scrollTop < 50 &&
      !isLoadingMore &&
      scrollBehaviorRef.current === "auto"
    ) {
      scrollBehaviorRef.current = "loadmore";
      loadMoreScrollPositionRef.current = container.scrollHeight - scrollTop;
      await loadMoreMessages();
    }
  }, [isLoadingMore, loadMoreMessages]);

  // Xử lý sau khi load more xong
  useEffect(() => {
    if (!isLoadingMore && scrollBehaviorRef.current === "loadmore") {
      const container = containerRef.current;
      if (container && loadMoreScrollPositionRef.current > 0) {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            const newScrollTop =
              containerRef.current.scrollHeight -
              loadMoreScrollPositionRef.current;
            containerRef.current.scrollTop = newScrollTop;
          }
        });
      }

      setTimeout(() => {
        scrollBehaviorRef.current = "auto";
        loadMoreScrollPositionRef.current = 0;
      }, 100);
    }
  }, [isLoadingMore]);

  // Highlight message
  useEffect(() => {
    if (!highlightMessageId || !containerRef.current) {
      if (!highlightMessageId && scrollBehaviorRef.current === "auto") {
        scrollBehaviorRef.current = "auto";
      }
      return;
    }

    scrollBehaviorRef.current = "auto";
    const targetElement = containerRef.current.querySelector(
      `[data-message-id="${highlightMessageId}"]`
    );

    if (targetElement) {
      setTimeout(() => {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        setTimeout(() => {
          onClearHighlight?.();
        }, 3000);
      }, 100);
    }
  }, [highlightMessageId, onClearHighlight]);

  // Xử lý initial load
  useEffect(() => {
    if (isInitialLoading || !containerRef.current) return;

    if (prevMessageCountRef.current === 0 && messages.length > 0) {
      scrollToBottom(false);
    }

    prevMessageCountRef.current = messages.length;
  }, [isInitialLoading, messages.length, scrollToBottom]);

  // Cleanup
  useEffect(() => {
    return () => {
      // Cleanup if needed
    };
  }, []);

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
              <div className="sticky top-0 z-10 flex justify-center py-2 bg-[#f5f7fb]/90 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="inline-flex items-center space-x-2"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full"
                  />
                  <span className="text-brand-700 font-medium text-sm">
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
                  messages.map((msg, index) => {
                    const isHighlighted = highlightMessageId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        data-message-id={msg.id}
                        className="relative"
                      >
                        <MessageItemOptimized
                          msg={msg}
                          index={index}
                          messages={messages}
                          currentUserId={currentUserId}
                          onPreviewMedia={setPreviewMedia}
                          display_name={display_name}
                          size="large"
                          isHighlighted={isHighlighted}
                        />
                      </div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            onClick={() => scrollToBottom(true)}
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
            className="absolute left-1/2 -translate-x-1/2 bottom-30 sm:bottom-40 bg-white text-[#2754d7] rounded-full shadow-xl p-2 sm:p-2.5 z-20 border border-[#c7d5f6]"
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
