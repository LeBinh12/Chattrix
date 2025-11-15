import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Messages } from "../../types/Message";
import type { Conversation } from "../../types/conversation";
import MessageItem from "./chat_content/MessageItem";
import MediaPreview from "./chat_content/MediaPreview";

type Props = {
  onUser: Conversation;
  currentUserId?: string;
  messages: Messages[];
  loadMoreMessages: () => void;
  isLoadingMore: boolean;
};

export default function ChatContent({
  onUser,
  currentUserId,
  messages,
  loadMoreMessages,
  isLoadingMore,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);
  const prevMessageCount = useRef(0);
  const prevDisplayName = useRef(onUser.display_name);
  const lastMessageId = useRef<string | null>(null);

  const handleScroll = async () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    setShowScrollButton(scrollTop + clientHeight < scrollHeight - 100);

    // Khi cuộn đến đầu và chưa loading
    if (scrollTop === 0 && !isLoadingMore) {
      const prevScrollHeight = container.scrollHeight;
      const prevScrollTop = container.scrollTop;

      await loadMoreMessages();

      // Đợi React render xong
      requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const newScrollHeight = containerRef.current.scrollHeight;

        // Giữ nguyên tầm nhìn cũ
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

    // Reset khi chuyển conversation (display_name thay đổi)
    if (prevDisplayName.current !== onUser.display_name) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
      prevDisplayName.current = onUser.display_name;
      prevMessageCount.current = messages.length;
      lastMessageId.current = messages[messages.length - 1]?.id || null;
      return;
    }

    // Kiểm tra tin nhắn mới thông qua ID thay vì chỉ số lượng
    const currentLastMessageId = messages[messages.length - 1]?.id;
    const hasNewMessage =
      messages.length > prevMessageCount.current &&
      currentLastMessageId !== lastMessageId.current;

    if (hasNewMessage) {
      const newMessage = messages[messages.length - 1];
      const isMyMessage = newMessage?.sender_id === currentUserId;

      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;

      // FIX 3: Luôn scroll xuống nếu là tin nhắn của mình HOẶC đang ở gần đáy
      if (isMyMessage || isAtBottom) {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      }

      lastMessageId.current = currentLastMessageId;
    }

    prevMessageCount.current = messages.length;
  }, [messages, onUser.display_name, currentUserId]);

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative flex-1 p-3 overflow-y-auto bg-gradient-to-b from-[#2665b1]
                scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-transparent"
      >
        {isLoadingMore && (
          <div className="text-center text-white py-2">Đang tải thêm...</div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white opacity-80 select-none py-10">
            <img
              src="/assets/logo.png"
              alt="logo"
              className="w-16 h-16 mb-4 opacity-80"
            />
            <div className="text-lg font-semibold">Chưa có tin nhắn nào</div>
            <div className="text-sm">Hãy bắt đầu cuộc trò chuyện đầu tiên!</div>
          </div>
        ) : (
          <div className="relative space-y-3">
            {messages.map((msg, index) => (
              <MessageItem
                key={msg.id}
                msg={msg}
                index={index}
                messages={messages}
                currentUserId={currentUserId}
                onPreviewMedia={setPreviewMedia}
                display_name={onUser.display_name}
                size="small"
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            onClick={scrollToBottom}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-24 bg-[#2665b1] hover:bg-[#1b4c8a] text-white rounded-full shadow-lg p-3 backdrop-blur-sm transition"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <MediaPreview
        mediaUrl={previewMedia}
        onClose={() => setPreviewMedia(null)}
      />
    </>
  );
}
