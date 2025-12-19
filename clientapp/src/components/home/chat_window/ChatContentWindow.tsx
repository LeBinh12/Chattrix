import { motion, AnimatePresence } from "framer-motion";
import type { Messages } from "../../../types/Message";
import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, ChevronsDown, MessageCircle } from "lucide-react";
import MessageItem from "../../chat/chat_content/MessageItem";
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
  isShowingSearchCache?: boolean;
  onClearSearchCache?: () => void;
};

export default function ChatContentWindow({
  display_name,
  currentUserId,
  messages,
  loadMoreMessages,
  isLoadingMore,
  isInitialLoading,
  highlightMessageId,
  onClearHighlight,
  isShowingSearchCache,
  onClearSearchCache,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  // ========== REFS ĐỂ QUẢN LÝ SCROLL ==========
  const scrollBehaviorRef = useRef<"auto" | "highlight" | "loadmore">("auto");
  const prevMessageCountRef = useRef(0);
  const prevDisplayNameRef = useRef(display_name);
  const lastMessageIdRef = useRef<string | null>(null);
  const messageTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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

  // ========== KIỂM TRA USER CÓ Ở BOTTOM KHÔNG ==========
  const isAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;
    const threshold = 50;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // ========== SCROLL TO BOTTOM ==========
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

  // ========== HANDLE SCROLL EVENT ==========
  const handleScroll = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // Update scroll button visibility
    const shouldShowButton = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollButton(shouldShowButton);

    // Detect user scrolling manually
    if (scrollBehaviorRef.current === "auto") {
      isUserScrollingRef.current = true;
      clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);
    }

    // ========== LOAD MORE MESSAGES ==========
    if (
      scrollTop < 50 &&
      !isLoadingMore &&
      scrollBehaviorRef.current === "auto"
    ) {
      scrollBehaviorRef.current = "loadmore";

      // Lưu vị trí scroll hiện tại
      loadMoreScrollPositionRef.current = container.scrollHeight - scrollTop;

      await loadMoreMessages();
    }
  }, [isLoadingMore, loadMoreMessages]);

  // ========== XỬ LÝ SAU KHI LOAD MORE XONG ==========
  useEffect(() => {
    if (!isLoadingMore && scrollBehaviorRef.current === "loadmore") {
      const container = containerRef.current;
      if (container && loadMoreScrollPositionRef.current > 0) {
        // Tính toán lại vị trí scroll để giữ nguyên view
        requestAnimationFrame(() => {
          if (containerRef.current) {
            const newScrollTop =
              containerRef.current.scrollHeight -
              loadMoreScrollPositionRef.current;
            containerRef.current.scrollTop = newScrollTop;
          }
        });
      }

      // Reset về auto sau khi restore position
      setTimeout(() => {
        scrollBehaviorRef.current = "auto";
        loadMoreScrollPositionRef.current = 0;
      }, 100);
    }
  }, [isLoadingMore]);

  // ========== HIGHLIGHT MESSAGE ==========
  useEffect(() => {
    if (!highlightMessageId || !containerRef.current) {
      if (!highlightMessageId && scrollBehaviorRef.current === "highlight") {
        scrollBehaviorRef.current = "auto";
      }
      return;
    }

    scrollBehaviorRef.current = "highlight";
    const targetElement = messageRefs.current[highlightMessageId];

    if (targetElement) {
      setTimeout(() => {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        setTimeout(() => {
          onClearHighlight?.();
          scrollBehaviorRef.current = "auto";
        }, 3000);
      }, 100);
    }      
  }, [highlightMessageId, onClearHighlight]);

  // ========== XỬ LÝ KHI ĐỔI CUỘC TRÒ CHUYỆN ==========
  useEffect(() => {
    if (prevDisplayNameRef.current !== display_name) {
      prevDisplayNameRef.current = display_name;
      prevMessageCountRef.current = messages.length;
      lastMessageIdRef.current = messages[messages.length - 1]?.id || null;

      // Clear highlight animations
      setNewMessageIds(new Set());
      messageTimeoutsRef.current.forEach(clearTimeout);
      messageTimeoutsRef.current.clear();

      // Reset scroll behavior
      scrollBehaviorRef.current = "auto";

      // Scroll to bottom khi đổi chat
      scrollToBottom(false);
    }
  }, [display_name, messages, scrollToBottom]);

  // ========== XỬ LÝ TIN NHẮN MỚI ==========
  useEffect(() => {
    // ✅ SKIP nếu đang load more hoặc highlight
    if (scrollBehaviorRef.current !== "auto") return;

    const container = containerRef.current;
    if (!container) return;

    const currentLastMessageId = messages[messages.length - 1]?.id;
    const hasNewMessage =
      messages.length > prevMessageCountRef.current &&
      currentLastMessageId !== lastMessageIdRef.current;

    if (hasNewMessage) {
      const newMessage = messages[messages.length - 1];
      const isMyMessage = newMessage?.sender_id === currentUserId;
      const wasAtBottom = isAtBottom();

      // Add highlight animation
      if (currentLastMessageId) {
        const existingTimeout =
          messageTimeoutsRef.current.get(currentLastMessageId);
        if (existingTimeout) clearTimeout(existingTimeout);

        setNewMessageIds((prev) => new Set(prev).add(currentLastMessageId));

        const timeout = setTimeout(() => {
          setNewMessageIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(currentLastMessageId);
            return newSet;
          });
          messageTimeoutsRef.current.delete(currentLastMessageId);
        }, 2000);

        messageTimeoutsRef.current.set(currentLastMessageId, timeout);
      }

      // ✅ CHỈ auto-scroll khi:
      // 1. Là tin nhắn của mình, HOẶC
      // 2. User đang ở bottom và không đang scroll
      const shouldAutoScroll =
        isMyMessage || (wasAtBottom && !isUserScrollingRef.current);

      if (shouldAutoScroll) {
        scrollToBottom(false);
      }

      lastMessageIdRef.current = currentLastMessageId;
    }

    prevMessageCountRef.current = messages.length;
  }, [messages, currentUserId, isAtBottom, scrollToBottom]);

  // ========== INITIAL LOAD ==========
  useEffect(() => {
    if (isInitialLoading || !containerRef.current) return;

    // Chỉ scroll xuống khi lần đầu load (prevCount = 0)
    if (prevMessageCountRef.current === 0 && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [isInitialLoading, messages.length, scrollToBottom]);

  // ========== CLEANUP ==========
  useEffect(() => {
    const timeouts = messageTimeoutsRef.current;
    const userScrollTimeout = userScrollTimeoutRef.current;

    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
      if (userScrollTimeout) clearTimeout(userScrollTimeout);
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
                      <motion.div
                        key={msg.id}
                        ref={(el) => (messageRefs.current[msg.id] = el)}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="relative"
                      >
                        {/* Highlight effect */}
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
                          isHighlighted={isHighlighted}
                        />
                      </motion.div>
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
            className="absolute left-1/2 -translate-x-1/2 bottom-30 sm:bottom-40 bg-white text-[#2754d7] rounded-full shadow-xl p-2 sm:p-2.5 z-20 border border-[#c7d5f6] cursor-pointer"
          >
            <motion.div
              animate={{ y: [0, 3, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.div>
          </motion.button>
        )}

        {/* Button to clear search cache */}
        {isShowingSearchCache && (
          <motion.button
            onClick={onClearSearchCache}
            initial={{ opacity: 0, y: -40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
            className="absolute left-1/2 -translate-x-1/3 bottom-32 sm:bottom-40 bg-white text-[#ff6b6b] rounded-full shadow-lg p-2 z-20 border border-[#ffb3b3] hover:bg-[#fff5f5] transition-colors cursor-pointer"
            title="Quay lại tin nhắn chính"
          >
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ChevronsDown className="w-4 h-4 sm:w-5 sm:h-5" />
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
