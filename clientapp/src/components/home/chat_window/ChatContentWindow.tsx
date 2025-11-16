import { motion, AnimatePresence } from "framer-motion";
import type { Messages } from "../../../types/Message";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import MessageItem from "../../chat/chat_content/MessageItem";
import MediaPreview from "../../chat/chat_content/MediaPreview";

type Props = {
  display_name: string;
  currentUserId?: string;
  messages: Messages[];
  loadMoreMessages: () => void;
  isLoadingMore: boolean;
};

export default function ChatContentWindow({
  display_name,
  currentUserId,
  messages,
  loadMoreMessages,
  isLoadingMore,
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
      {/* Logo mờ giữa */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-1">
        <img
          src="/assets/logo.png"
          alt="logo"
          className="opacity-10 w-40 h-40 sm:w-52 sm:h-52 object-contain select-none"
        />
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="
                  relative flex-1 p-3 overflow-y-auto 
                  bg-[#003ea3] to-blue-100/60
                  scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-blue-100/50
                  transition-colors
                "
      >
        {isLoadingMore && (
          <div className="text-center text-blue-600 py-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-flex items-center space-x-2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
              />
              <span className="text-blue-700 font-medium">
                Đang tải thêm...
              </span>
            </motion.div>
          </div>
        )}

        <div className="relative space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center h-full space-y-4"
              >
                <div className="text-center space-y-2">
                  <div className="text-blue-900 text-lg font-medium">
                    Chưa có tin nhắn nào với {display_name}
                  </div>
                  <div className="text-blue-600 text-sm">
                    Hãy bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn đầu tiên
                  </div>
                </div>
              </motion.div>
            ) : (
              messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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
                          ? "bg-blue-400"
                          : "bg-blue-300"
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
            className="absolute left-1/2 -translate-x-1/2 bottom-40 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg p-3 backdrop-blur-sm z-20 ring-2 ring-blue-300/50"
          >
            <motion.div
              animate={{ y: [0, 3, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ChevronDown className="w-5 h-5" />
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
