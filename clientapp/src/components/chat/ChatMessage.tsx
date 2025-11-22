import { useCallback, useEffect, useState } from "react";
import ChatHeader from "./ChatHeader";
import ChatContent from "./ChatContent";
import ChatInput from "./ChatInput";
import ChatSkeleton from "../../skeleton/ChatSkeleton";
import { useRecoilValue } from "recoil";
import { userAtom } from "../../recoil/atoms/userAtom";
import { messageAPI } from "../../api/messageApi";
import type { Conversation } from "../../types/conversation";
import type { Messages } from "../../types/Message";
import { socketManager } from "../../api/socket";

type Props = {
  onFriend: Conversation;
  onBack: () => void;
};

export default function ChatMessage({ onFriend, onBack }: Props) {
  const user = useRecoilValue(userAtom);
  const currentUserId = user?.data?.id;
  const receiverId = onFriend?.user_id;
  const groupID = onFriend?.group_id;

  const [messages, setMessages] = useState<Messages[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const limit = 30;

  // ============================
  // 🔥 Lấy lịch sử tin nhắn
  // ============================
  const fetchMessages = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);

      const res = await messageAPI.getMessage(receiverId, groupID, limit, "0");

      const sorted = (res.data.data || []).sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(sorted);
    } catch (err) {
      console.error("❌ Lỗi load tin nhắn:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, receiverId, groupID]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ============================
  // 🔥 Socket realtime listener
  // ============================
  useEffect(() => {
    if (!currentUserId) return;

    socketManager.connect(currentUserId);

    const listener = (data: any) => {
      if (data.type !== "chat" || !data.message) return;

      const msg: Messages = data.message;

      // CHỈ nhận tin đúng cuộc trò chuyện
      const isDirect =
        (msg.sender_id === currentUserId && msg.receiver_id === receiverId) ||
        (msg.sender_id === receiverId && msg.receiver_id === currentUserId);

      const isGroup = msg.group_id && msg.group_id === groupID;

      if (isDirect || isGroup) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socketManager.addListener(listener);

    return () => {
      socketManager.removeListener(listener);
    };
  }, [currentUserId, receiverId, groupID]);

  // ============================
  // 🔥 Load thêm tin nhắn (scroll lên)
  // ============================
  const loadMoreMessages = async () => {
    if (isLoadingMore || messages.length === 0) return;

    try {
      setIsLoadingMore(true);

      // Lấy thời gian của tin nhắn đầu tiên hiện tại
      const beforeTime = messages[0].created_at;

      const res = await messageAPI.getMessage(
        receiverId,
        groupID,
        limit,
        beforeTime
      );

      const newMessages: Messages[] = (res.data.data || []).sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      if (newMessages.length) {
        // ghép tin nhắn cũ vào trước
        setMessages((prev) => [...newMessages, ...prev]);
      }
    } catch (err) {
      console.error("❌ Lỗi tải tin nhắn cũ:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (loading) {
    return <ChatSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader onUser={onFriend} onBack={onBack} />
      <ChatContent
        onUser={onFriend}
        currentUserId={currentUserId}
        messages={messages}
        loadMoreMessages={loadMoreMessages}
        isLoadingMore={isLoadingMore}
      />
      <ChatInput senderID={user?.data} receiverID={onFriend} />
    </div>
  );
}
