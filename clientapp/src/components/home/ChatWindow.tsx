import { useCallback, useEffect, useState, useRef } from "react";
import { TING } from "../../assets/paths";
import { useRecoilState, useRecoilValue } from "recoil";
import ChatHeaderWindow from "./chat_window/ChatHeaderWindow";
import ChatContentWindow from "./chat_window/ChatContentWindow";
import ChatInputWindow from "./chat_window/ChatInputWindow";
import EmptyChatWindow from "./EmptyChatWindow";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { userAtom } from "../../recoil/atoms/userAtom";
import {
  messageIDAtom,
  messagesCacheAtom,
} from "../../recoil/atoms/messageAtom";
import { bellStateAtom } from "../../recoil/atoms/bellAtom";
import type { Messages } from "../../types/Message";
import { messageAPI } from "../../api/messageApi";
import { socketManager } from "../../api/socket";
import axios from "axios";
import { toast } from "react-toastify";

type ChatSocketEvent =
  | { type: "chat"; message: Messages }
  | {
      type: "update_seen";
      message: {
        last_seen_message_id?: string;
        receiver_id?: string;
        sender_id?: string;
      };
    }
  | {
      type: "delete_for_me";
      message: { user_id: string; message_ids: string[] };
    }
  | { type?: string; message?: unknown };

type ChatWindowProps = {
  onBack?: () => void;
};

export default function ChatWindow({ onBack }: ChatWindowProps) {
  const selectedChat = useRecoilValue(selectedChatState);
  const user = useRecoilValue(userAtom);
  const [messages, setMessages] = useState<Messages[]>([]);
  const [messagesCache, setMessagesCache] = useRecoilState(messagesCacheAtom);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [hasLeftGroup, setHasLeftGroup] = useState(false);
  const [bell] = useRecoilState(bellStateAtom);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [messageIDSearch, setMessageIDSearch] = useRecoilState(messageIDAtom);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(
    null
  );

  const limit = 30;
  const tingAudioRef = useRef<HTMLAudioElement | null>(null);
  const loadedCountRef = useRef<{ [key: string]: number }>({});
  const loadingStartRef = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversationKey = selectedChat
    ? selectedChat.group_id &&
      selectedChat.group_id !== "000000000000000000000000"
      ? `group_${selectedChat.group_id}`
      : `user_${selectedChat.user_id}`
    : "";
  const cachedMessages = conversationKey
    ? messagesCache[conversationKey]
    : undefined;

  const beginInitialLoading = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    loadingStartRef.current = Date.now();
    setIsInitialLoading(true);
  }, []);

  const finishInitialLoading = useCallback(() => {
    const start = loadingStartRef.current;
    const elapsed = start ? Date.now() - start : 0;
    const remaining = Math.max(0, 1000 - elapsed);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    loadingTimeoutRef.current = setTimeout(() => {
      setIsInitialLoading(false);
      loadingTimeoutRef.current = null;
    }, remaining);
  }, []);

  useEffect(() => {
    tingAudioRef.current = new Audio(TING);

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!bell?.is_muted && tingAudioRef.current) {
      tingAudioRef.current.currentTime = 0;
      tingAudioRef.current.play().catch(console.warn);
    }
  }, [bell]);

  // Fetch messages với hỗ trợ tìm kiếm theo ID
  const fetchMessages = useCallback(async () => {
    if (!user?.data.id || !conversationKey) return;

    // Nếu có messageIDSearch, xử lý tìm kiếm
    // Nếu có messageIDSearch, xử lý tìm kiếm
    if (messageIDSearch) {
      // Kiểm tra trong cache trước
      const cachedMsgs = messagesCache[conversationKey];
      const foundInCache = cachedMsgs?.find(
        (msg) => msg.id === messageIDSearch
      );

      if (foundInCache) {
        // Tin nhắn đã có trong cache
        setMessages(cachedMsgs);
        setHighlightMessageId(messageIDSearch);
        setIsInitialLoading(false);
        setMessageIDSearch(""); // Clear search sau khi tìm thấy
        return;
      }

      // Nếu chưa có trong cache, gọi API
      try {
        beginInitialLoading();
        const res = await messageAPI.getMessageById(
          selectedChat?.user_id ?? "",
          selectedChat?.group_id ?? "",
          messageIDSearch
        );

        if (res.status === 200 && res.data.data && res.data.data.length > 0) {
          const sorted: Messages[] = res.data.data.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );

          setMessagesCache((prev) => ({
            ...prev,
            [conversationKey]: sorted,
          }));
          setMessages(sorted);
          setHighlightMessageId(messageIDSearch);
          setHasMore(true);
        } else {
          // ✅ Tin nhắn không tồn tại - chỉ thông báo, giữ nguyên cache
          toast.warning("Tin nhắn này đã được bạn xóa!");
          // Không thay đổi messages, giữ nguyên cache hiện tại
          if (cachedMsgs && cachedMsgs.length > 0) {
            setMessages(cachedMsgs);
          }
        }
      } catch (error: unknown) {
        // ✅ Xử lý lỗi - chỉ thông báo, giữ nguyên cache
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const apiMsg =
            error.response?.data?.error || error.response?.data?.message;

          if (
            status === 404 ||
            apiMsg?.toLowerCase().includes("xóa") ||
            apiMsg?.toLowerCase().includes("deleted")
          ) {
            toast.warning("Tin nhắn này đã được bạn xóa!");
          } else {
            toast.error(apiMsg || "Đã xảy ra lỗi khi lấy tin nhắn!");
          }
        } else {
          toast.error("Lỗi không xác định!");
        }

        // Giữ nguyên cache hiện tại
        if (cachedMsgs && cachedMsgs.length > 0) {
          setMessages(cachedMsgs);
        }

        console.error("❌ Lỗi khi tải tin nhắn theo ID:", error);
      } finally {
        finishInitialLoading();
        setMessageIDSearch(""); // ✅ Clear search ID trong mọi trường hợp
      }

      return;
    }

    // Fetch bình thường nếu không có messageIDSearch
    if (messagesCache[conversationKey]?.length) {
      setMessages(messagesCache[conversationKey]);
      setHasMore(messagesCache[conversationKey].length >= limit);
      setIsInitialLoading(false);
      return;
    }

    try {
      beginInitialLoading();
      const res = await messageAPI.getMessage(
        selectedChat?.user_id ?? "",
        selectedChat?.group_id ?? "",
        limit
      );

      const sorted: Messages[] = (res.data.data || []).sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessagesCache((prev) => ({
        ...prev,
        [conversationKey]: sorted,
      }));
      setMessages(sorted);
      loadedCountRef.current[conversationKey] = sorted.length;
      setHasMore(sorted.length >= limit);
    } catch (err) {
      console.error("❌ Lỗi khi tải tin nhắn:", err);
    } finally {
      finishInitialLoading();
    }
  }, [
    user?.data.id,
    selectedChat,
    conversationKey,
    messagesCache,
    setMessagesCache,
    beginInitialLoading,
    finishInitialLoading,
    messageIDSearch,
    setMessageIDSearch,
  ]);

  // Reset messages when selected chat changes
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      setHasMore(true);
      setHasLeftGroup(false);
      setIsInitialLoading(false);
      setHighlightMessageId(null);
      return;
    }

    if (cachedMessages?.length && !messageIDSearch) {
      setMessages(cachedMessages);
      setIsInitialLoading(false);
    } else {
      setMessages([]);
      beginInitialLoading();
    }

    setHasMore(true);
    setHasLeftGroup(false);
  }, [selectedChat, cachedMessages, beginInitialLoading, messageIDSearch]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Load more
  const loadMoreMessages = async () => {
    if (!selectedChat || isLoadingMore || !hasMore || !conversationKey) return;

    try {
      setIsLoadingMore(true);
      const oldMessages = messagesCache[conversationKey] || messages;
      if (!oldMessages.length) return;

      const beforeTime = oldMessages[0].created_at;
      const res = await messageAPI.getMessage(
        selectedChat.user_id ?? "",
        selectedChat.group_id ?? "",
        limit,
        beforeTime
      );

      const newMessages: Messages[] = (res.data.data || []).sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      if (!newMessages.length) {
        setHasMore(false);
        return;
      }

      setMessagesCache((prev) => {
        const combined = [...newMessages, ...(prev[conversationKey] || [])];
        const unique = combined.filter(
          (msg, index, self) => self.findIndex((m) => m.id === msg.id) === index
        );
        return { ...prev, [conversationKey]: unique };
      });

      setMessages((prev) => {
        const combined = [...newMessages, ...prev];
        return combined.filter(
          (msg, index, self) => self.findIndex((m) => m.id === msg.id) === index
        );
      });

      setHasMore(newMessages.length >= limit);
    } catch (err) {
      console.error("Lỗi khi tải thêm tin nhắn:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDeleteForMe = useCallback(
    (payload: { user_id: string; message_ids: string[] }) => {
      if (!payload || payload.user_id !== user?.data.id) return;

      const messageIDsToDelete = new Set(payload.message_ids);

      setMessagesCache((prev) => {
        if (!conversationKey || !prev[conversationKey]) return prev;
        return {
          ...prev,
          [conversationKey]: prev[conversationKey].filter(
            (msg) => !messageIDsToDelete.has(msg.id)
          ),
        };
      });

      setMessages((prev) =>
        prev.filter((msg) => !messageIDsToDelete.has(msg.id))
      );
    },
    [conversationKey, setMessagesCache, user?.data.id]
  );

  const handleIncomingMessage = useCallback(
    (msg: Messages) => {
      if (!msg) return;
      const msgKey =
        msg.group_id && msg.group_id !== "000000000000000000000000"
          ? `group_${msg.group_id}`
          : `user_${
              msg.sender_id === user?.data.id ? msg.receiver_id : msg.sender_id
            }`;

      if (msg.sender_id !== user?.data.id) playNotificationSound();

      setMessagesCache((prev) => {
        const oldMessages = prev[msgKey] || [];
        if (oldMessages.some((m) => m.id === msg.id)) return prev;
        return { ...prev, [msgKey]: [...oldMessages, msg] };
      });

      if (msgKey === conversationKey) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      if (
        msg.type === "system" &&
        msg.sender_id === user?.data.id &&
        msg.group_id === selectedChat?.group_id
      ) {
        setHasLeftGroup(true);
      }
    },
    [
      conversationKey,
      playNotificationSound,
      selectedChat?.group_id,
      setMessagesCache,
      user?.data.id,
    ]
  );

  const handleUpdateSeen = useCallback(
    (seenData: {
      last_seen_message_id?: string;
      receiver_id?: string;
      sender_id?: string;
    }) => {
      if (!seenData?.last_seen_message_id) return;
      const { last_seen_message_id, receiver_id, sender_id } = seenData;
      const seenConversationKey =
        sender_id === user?.data.id
          ? `user_${receiver_id}`
          : `user_${sender_id}`;

      const updateStatus = (msgs: Messages[]) =>
        msgs.map((msg) =>
          msg.sender_id === user?.data.id && msg.id <= last_seen_message_id
            ? { ...msg, status: "seen", is_read: true }
            : msg
        );

      setMessagesCache((prev) => {
        const cached = prev[seenConversationKey];
        if (!cached?.length) return prev;
        return { ...prev, [seenConversationKey]: updateStatus(cached) };
      });

      if (seenConversationKey === conversationKey) {
        setMessages((prev) => updateStatus(prev));
      }
    },
    [conversationKey, setMessagesCache, user?.data.id]
  );

  useEffect(() => {
    if (!user?.data.id) return;
    socketManager.connect(user?.data.id);

    const listener = (data: ChatSocketEvent) => {
      switch (data.type) {
        case "chat":
          if (data.message) {
            handleIncomingMessage(data.message as Messages);
          }
          break;
        case "update_seen":
          if (data.message) {
            handleUpdateSeen(data.message);
          }
          break;
        case "delete_for_me":
          if (
            data.message &&
            typeof data.message === "object" &&
            "user_id" in data.message &&
            "message_ids" in data.message
          ) {
            handleDeleteForMe(
              data.message as { user_id: string; message_ids: string[] }
            );
          }
          break;
      }
    };

    socketManager.addListener(listener);
    return () => socketManager.removeListener(listener);
  }, [
    user?.data.id,
    handleDeleteForMe,
    handleIncomingMessage,
    handleUpdateSeen,
  ]);

  useEffect(() => {
    if (!messages.length || !selectedChat) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender_id !== user?.data.id) {
      socketManager.sendSeenMessage(
        lastMsg.id,
        selectedChat?.user_id,
        user?.data.id
      );
    }
  }, [messages, selectedChat, user?.data.id]);

  if (!selectedChat) return <EmptyChatWindow />;

  return (
    <div className="flex flex-col w-full h-full max-h-screen bg-[#f5f7fb] text-[#1c2333]">
      <ChatHeaderWindow
        avatar={selectedChat.avatar}
        display_name={selectedChat.display_name ?? "không tên"}
        status={selectedChat.status}
        update_at={selectedChat.update_at}
        onBack={onBack}
      />
      <ChatContentWindow
        display_name={selectedChat.display_name ?? "không tên"}
        currentUserId={user?.data.id}
        messages={messages}
        loadMoreMessages={loadMoreMessages}
        isLoadingMore={isLoadingMore}
        isInitialLoading={isInitialLoading}
        highlightMessageId={highlightMessageId}
        onClearHighlight={() => setHighlightMessageId(null)}
      />
      <ChatInputWindow
        user_id={user?.data.id || ""}
        receiver_id={selectedChat.user_id ?? ""}
        group_id={selectedChat.group_id ?? ""}
        hasLeftGroup={hasLeftGroup}
        avatar={selectedChat.avatar}
        display_name={selectedChat.display_name}
      />
    </div>
  );
}
