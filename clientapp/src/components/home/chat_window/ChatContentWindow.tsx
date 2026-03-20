import { motion, AnimatePresence } from "framer-motion";
import type { Messages } from "../../../types/Message";
import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, ChevronsDown, MessageCircle } from "lucide-react";
import MessageItem from "../../chat/chat_content/MessageItem";
import MediaPreview from "../../chat/chat_content/MediaPreview";
import { BUTTON_HOVER } from "../../../utils/className";
import { socketManager } from "../../../api/socket";
import { toast } from "react-toastify";
import ChannelSelectionModal from "../../chat/ChannelSelectionModal";
import { useRecoilValue } from "recoil";
import { richTextVisibleAtom } from "../../../recoil/atoms/uiAtom";

type Props = {
  display_name: string;
  conversationKey?: string;
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
  conversationKey,
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
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardMsgId, setForwardMsgId] = useState<string | null>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  // ========== REFS ĐỂ QUẢN LÝ SCROLL ==========
  const scrollBehaviorRef = useRef<"auto" | "highlight" | "loadmore">("auto");
  const prevMessageCountRef = useRef(0);
  const prevDisplayNameRef = useRef(display_name);
  const convKeyRef = useRef(conversationKey)
  const justChangedConvRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const messageTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isRichTextVisible = useRecoilValue(richTextVisibleAtom);

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
      // Thực hiện scroll ngay lập tức
      container.scrollTop = container.scrollHeight;
    
      // Cleanup timers if needed, though they are short-lived
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

  // ✅ CHỈ GIỮ LẠI 1 ĐOẠN LOAD MORE
  if (
    scrollTop < 50 &&
    !isLoadingMore &&
    scrollBehaviorRef.current === "auto"
  ) {
    console.log(" Triggering load more, isShowingSearchCache:", isShowingSearchCache);
    scrollBehaviorRef.current = "loadmore";
    
    // Lưu vị trí scroll hiện tại
    loadMoreScrollPositionRef.current = container.scrollHeight - scrollTop;
    
    await loadMoreMessages();
  }
}, [isLoadingMore, loadMoreMessages, isShowingSearchCache]); // ✅ Thêm dependency
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
    const keyChanged = convKeyRef.current !== conversationKey;
    const nameChanged = prevDisplayNameRef.current !== display_name;

    if (keyChanged || (!conversationKey && nameChanged)) {
      convKeyRef.current = conversationKey;
      prevDisplayNameRef.current = display_name;

      
      justChangedConvRef.current = true;
   
      initialScrollDoneRef.current = false;


      prevMessageCountRef.current = 0;
      lastMessageIdRef.current = null;

      // Clear highlight animations
      setNewMessageIds(new Set());
      messageTimeoutsRef.current.forEach(clearTimeout);
      messageTimeoutsRef.current.clear();

      // Reset scroll behavior
      scrollBehaviorRef.current = "auto";
    }
  }, [conversationKey, display_name]);

  // ========== XỬ LÝ TIN NHẮN MỚI ==========
  useEffect(() => {
    // ✅ SKIP nếu đang load more hoặc highlight
    if (scrollBehaviorRef.current !== "auto") return;

  
    if (justChangedConvRef.current) {
      justChangedConvRef.current = false;
 
      return;
    }

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
    if (!initialScrollDoneRef.current && messages.length > 0) {
      initialScrollDoneRef.current = true;
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

  const handleOpenForward = (msgId: string) => {
    setForwardMsgId(msgId);
    setForwardModalOpen(true);
  };

  const handleForwardSubmit = async (targets: { receiverIds: string[]; groupIds: string[] }) => {
    if (!forwardMsgId || !currentUserId) return;
    
    // Find original message data
    const originalMsg = messages.find(m => m.id === forwardMsgId);
    if (!originalMsg) return;

    try {
      socketManager.sendForwardMessage(
        currentUserId,
        originalMsg.content,
        originalMsg.type,
        originalMsg.media_ids || [],
        targets.receiverIds,
        targets.groupIds
      );
      toast.success("Đã chuyển tiếp tin nhắn!");
    } catch {
      toast.error("Gửi tin nhắn thất bại!");
    }
  };

  return (
    <>
      <div className="relative flex-1 flex flex-col min-h-0">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="!flex-1 !min-h-0 !px-3 sm:!px-6 !py-3 sm:!py-4 !overflow-y-auto !bg-[#f5f7fb] hide-scrollbar !transition-colors"
        >
          {isInitialLoading ? (
            <div className="!h-full !flex !items-center !justify-center">
              <div className="!w-full !max-w-xl !space-y-5 !animate-pulse">
                {/* Tin nhắn từ người khác (bên trái) */}
                <div className="!flex !items-start !gap-3">
                  <div className="!w-9 !h-9 !rounded-full !bg-[#e0f2fe]" /> {/* Avatar skeleton - xanh nhạt */}
                  <div className="!space-y-2 !flex-1">
                    <div className="!h-5 !bg-[#f1f5f9] !rounded-2xl !w-3/4" /> {/* Bubble skeleton */}
                    <div className="!h-5 !bg-[#f1f5f9] !rounded-2xl !w-2/3" />
                  </div>
                </div>

                {/* Tin nhắn của mình (bên phải) */}
                <div className="!flex !items-start !gap-3 !justify-end">
                  <div className="!space-y-2 !flex-1 !max-w-[70%]">
                    <div className="!h-5 !bg-[#bae6fd] !rounded-2xl !w-full" /> {/* Màu nổi bật hơn cho tin của mình */}
                    <div className="!h-5 !bg-[#bae6fd] !rounded-2xl !w-4/5 !ml-auto" />
                  </div>
                  <div className="!w-9 !h-9 !rounded-full !bg-[#bae6fd]" /> {/* Avatar mình - nổi bật hơn */}
                </div>

                {/* Tin nhắn từ người khác */}
                <div className="!flex !items-start !gap-3">
                  <div className="!w-9 !h-9 !rounded-full !bg-[#e0f2fe]" />
                  <div className="!h-5 !bg-[#f1f5f9] !rounded-2xl !w-5/6" />
                </div>

                {/* Tin nhắn của mình */}
                <div className="!flex !items-start !gap-3 !justify-end">
                  <div className="!space-y-2 !flex-1 !max-w-[65%]">
                    <div className="!h-5 !bg-[#bae6fd] !rounded-2xl !w-full" />
                    <div className="!h-5 !bg-[#bae6fd] !rounded-2xl !w-2/3 !ml-auto" />
                  </div>
                  <div className="!w-9 !h-9 !rounded-full !bg-[#bae6fd]" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {isLoadingMore && (
                <div className="!sticky !top-0 !z-10 !flex !justify-center !py-2 !bg-[#f5f7fb]/90 !backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="!inline-flex !items-center !space-x-2"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="!w-4 !h-4 !border-2 !border-brand-500 !border-t-transparent !rounded-full"
                    />
                    <span className="!text-brand-700 !font-medium !text-sm">
                      Đang tải thêm...
                    </span>
                  </motion.div>
                </div>
              )}

              <div className="!relative !space-y-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="!flex !flex-col !items-center !justify-center !h-full !space-y-3 !text-center !py-16"
                    >
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                        className="!w-50 !h-16"
                      >
                        <img
                          src="src/assets/Logo-Dai-hoc-Dong-Thap.png"
                          alt="Đại học Đồng Tháp"
                          className="w-50 h-16 object-contain"
                        />
                      </motion.div>
                      <div className="!text-[#00568c] !text-sm !font-semibold">
                        Bắt đầu cuộc trò chuyện
                      </div>
                      <div className="!text-[#3399dd] !text-xs !w-3/4 !leading-relaxed">
                        Hãy gửi một lời chào đến {display_name} để mở đầu cuộc hội thoại.
                        Tin nhắn của bạn sẽ được hiển thị tại đây.
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
                          className="!relative"
                        >
                          {/* Highlight effect */}
                          {newMessageIds.has(msg.id) && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0, 0.3, 0] }}
                              transition={{ duration: 2, ease: "easeInOut" }}
                              className={`!absolute !inset-0 !rounded-2xl !pointer-events-none !z-0 ${msg.sender_id === currentUserId
                                  ? "!bg-[#bcd5ff]/40"
                                  : "!bg-[#d4dded]/50"
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
                            onForward={handleOpenForward}
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
          {showScrollButton && !isShowingSearchCache && (
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
              className={`!absolute !left-1/2 !-translate-x-1/2 !z-20 !border !border-[#00568c] ${BUTTON_HOVER} !text-[#00568c] !rounded-full !shadow-xl !p-2 sm:!p-2.5 !bottom-4`}
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
              className={`!absolute !left-1/2 !-translate-x-1/2 !z-20 !border !border-[#ffb3b3] hover:!bg-[#fff5f5] !transition-colors !cursor-pointer !flex !items-center !gap-2 !bg-white !text-[#ff6b6b] !rounded-full !shadow-lg !px-4 !py-2 !bottom-4`}
              title="Quay lại tin nhắn chính"
            >
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <ChevronsDown className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.div>
              <span className="!text-xs !font-bold">Quay lại</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <MediaPreview
        mediaUrl={previewMedia}
        onClose={() => setPreviewMedia(null)}
        allMedia={allMedia}
      />

      <ChannelSelectionModal
        isOpen={forwardModalOpen}
        onClose={() => setForwardModalOpen(false)}
        onSubmit={handleForwardSubmit}
      />
    </>
  );
}
