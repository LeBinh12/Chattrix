import { useCallback, useEffect, useState, useRef } from "react";
import { TING } from "../../assets/paths";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import ChatHeaderWindow from "./chat_window/ChatHeaderWindow";
import ChatContentWindow from "./chat_window/ChatContentWindow";
import ChatInputWindow from "./chat_window/ChatInputWindow";
import EmptyChatWindow from "./EmptyChatWindow";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { userAtom } from "../../recoil/atoms/userAtom";
import {
  messageIDAtom,
  messagesCacheAtom,
  messagesSearchCacheAtom,
} from "../../recoil/atoms/messageAtom";
import { bellStateAtom } from "../../recoil/atoms/bellAtom";
import type { Messages } from "../../types/Message";
import { messageAPI } from "../../api/messageApi";
import { socketManager } from "../../api/socket";
import axios from "axios";
import { toast } from "react-toastify";
import { conversationListAtom } from "../../recoil/atoms/conversationListAtom";
import type { Conversation } from "../../types/conversation";
import type { PinnedMessageDetail } from "../../types/pinned_message";
import PinnedMessageBar from "./chat_window/PinnedMessageBar";

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
  | { type?: string; message?: unknown }
  | { type: "pinned-message"; message: Messages | PinnedMessageDetail }
  | { type: "un-pinned-message"; message: Messages | PinnedMessageDetail }
  | { type: "recall-message"; message: Messages };

type ChatWindowProps = {
  onBack?: () => void;
};

export default function ChatWindow({ onBack }: ChatWindowProps) {
  const selectedChat = useRecoilValue(selectedChatState);
  const user = useRecoilValue(userAtom);
  const [messages, setMessages] = useState<Messages[]>([]);
  const [messagesCache, setMessagesCache] = useRecoilState(messagesCacheAtom);
  const [messagesSearchCache, setMessagesSearchCache] = useRecoilState(
    messagesSearchCacheAtom
  );
  const setConversation = useSetRecoilState(conversationListAtom);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [hasLeftGroup, setHasLeftGroup] = useState(false);
  const [bell] = useRecoilState(bellStateAtom);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [messageIDSearch, setMessageIDSearch] = useRecoilState(messageIDAtom);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(
    null
  );
  const [isShowingSearchCache, setIsShowingSearchCache] = useState(false);

  const limit = 30;
  const tingAudioRef = useRef<HTMLAudioElement | null>(null);
  const loadedCountRef = useRef<{ [key: string]: number }>({});
  const loadingStartRef = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRealtimeMessages = useRef<{ [key: string]: Messages[] }>({});
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessageDetail[]>(
    []
  );
  
  // ✅ Thêm ref để track conversation đã được fetch
  const fetchedConversationsRef = useRef<Set<string>>(new Set());

  const isGroup =
    !!selectedChat?.group_id &&
    selectedChat.group_id !== "000000000000000000000000";

  const conversationKey = selectedChat
    ? isGroup
      ? `group_${selectedChat.group_id}`
      : `user_${selectedChat.user_id}`
    : "";

  const beginInitialLoading = useCallback(() => {
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

  const fetchPinnedMessages = useCallback(async () => {
    if (!selectedChat || !user?.data.id) return;

    try {

      const res = await messageAPI.getPinned(
        selectedChat.user_id ?? "",
        selectedChat.group_id ?? ""
      );
      if (res.status === 200 && res.data?.data) {
        // Sort by pinned_at desc để tin mới nhất lên đầu
        const sorted = res.data.data.sort(
          (a, b) =>
            new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime()
        );
        setPinnedMessages(sorted);
      }
    } catch (err) {
      console.error("Lỗi khi tải tin nhắn ghim:", err);
    }
  }, [selectedChat, user?.data.id]);

  // ✅ REFACTOR: fetchMessages - CHỈ set loading khi thực sự gọi API
  const fetchMessages = useCallback(async () => {
    if (!user?.data.id || !conversationKey) return;

    // ✅ QUAN TRỌNG: Kiểm tra cache TRƯỚC, không bật loading nếu có cache
    
    // Nếu có messageIDSearch, xử lý tìm kiếm
    if (messageIDSearch) {
      // Kiểm tra trong search cache trước (ưu tiên hơn)
      const searchCachedMsgs = messagesSearchCache[conversationKey];
      const foundInSearchCache = searchCachedMsgs?.find(
        (msg) => msg.id === messageIDSearch
      );

      if (foundInSearchCache) {
        // Tin nhắn đã có trong search cache - hiển thị search cache
        setMessages(searchCachedMsgs);
        setHighlightMessageId(messageIDSearch);
        setIsShowingSearchCache(true);
        setMessageIDSearch("");
        return;
      }

      // Kiểm tra trong cache chính tiếp theo
      const cachedMsgs = messagesCache[conversationKey];
      const foundInMainCache = cachedMsgs?.find(
        (msg) => msg.id === messageIDSearch
      );

      if (foundInMainCache) {
        // Tin nhắn đã có trong cache chính - hiển thị cache chính
        setMessages(cachedMsgs);
        setHighlightMessageId(messageIDSearch);
        setIsShowingSearchCache(false);
        setMessageIDSearch("");
        return;
      }

      // ✅ CHỈ BẬT LOADING KHI GỌI API
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

          // Lưu vào search cache thay vì cache chính
          setMessagesSearchCache((prev) => ({
            ...prev,
            [conversationKey]: sorted,
          }));
          setMessages(sorted);
          setHighlightMessageId(messageIDSearch);
          setIsShowingSearchCache(true);
          setHasMore(sorted.length >= limit);
        } else {
          // Tin nhắn không tồn tại
          toast.warning("Tin nhắn này đã được bạn xóa!");
          // Giữ nguyên messages hiện tại
        }
      } catch (error: unknown) {
        // Xử lý lỗi
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

        console.error("Lỗi khi tải tin nhắn theo ID:", error);
      } finally {
        finishInitialLoading();
        setMessageIDSearch(""); // Clear search ID
      }

      return;
    }

    // Fetch bình thường nếu không có messageIDSearch
    // ✅ Ưu tiên search cache nếu có, nếu không thì dùng cache chính
    const searchCachedMsgs = messagesSearchCache[conversationKey];
    if (searchCachedMsgs?.length) {
      setMessages(searchCachedMsgs);
      setIsShowingSearchCache(true);
      setHasMore(searchCachedMsgs.length >= limit);
      return;
    }

    const mainCachedMsgs = messagesCache[conversationKey];
    if (mainCachedMsgs?.length) {
      setMessages(mainCachedMsgs);
      setIsShowingSearchCache(false);
      setHasMore(mainCachedMsgs.length >= limit);
      return;
    }

    // ✅ CHỈ BẬT LOADING KHI GỌI API VÀ CHƯA CÓ CACHE
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
      setIsShowingSearchCache(false);
      loadedCountRef.current[conversationKey] = sorted.length;
      setHasMore(sorted.length >= limit);
      
      // ✅ Đánh dấu conversation đã fetch
      fetchedConversationsRef.current.add(conversationKey);
    } catch (err) {
      console.error("Lỗi khi tải tin nhắn:", err);
    } finally {
      finishInitialLoading();
    }
  }, [
    user?.data.id,
    selectedChat,
    conversationKey,
    messagesCache,
    messagesSearchCache,
    setMessagesCache,
    setMessagesSearchCache,
    beginInitialLoading,
    finishInitialLoading,
    messageIDSearch,
    setMessageIDSearch,
  ]);

  useEffect(() => {
    if (selectedChat) {
      fetchPinnedMessages();
    } else {
      setPinnedMessages([]);
    }
  }, [selectedChat, fetchPinnedMessages]);

  // ✅ REFACTOR: Reset messages - KHÔNG bật loading, chỉ reset state
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      setHasMore(true);
      setHasLeftGroup(false);
      // ✅ KHÔNG set isInitialLoading ở đây
      setHighlightMessageId(null);
      setIsShowingSearchCache(false);
      return;
    }

    // Ưu tiên search cache nếu có
    const searchCachedMsgs = messagesSearchCache[conversationKey];
    if (searchCachedMsgs?.length && !messageIDSearch) {
      setMessages(searchCachedMsgs);
      setIsShowingSearchCache(true);
      // ✅ KHÔNG set isInitialLoading ở đây
    } else {
      // Nếu không có search cache thì dùng main cache
      const mainCachedMsgs = messagesCache[conversationKey];
      if (mainCachedMsgs?.length && !messageIDSearch) {
        setMessages(mainCachedMsgs);
        setIsShowingSearchCache(false);
        // ✅ KHÔNG set isInitialLoading ở đây
      } 
    }

    setHasMore(true);
    setHasLeftGroup(false);
  }, [
    selectedChat,
    messageIDSearch,
    messagesSearchCache,
    messagesCache,
    conversationKey,
  ]);

  // ✅ REFACTOR: CHỈ gọi fetchMessages khi chưa có cache
  useEffect(() => {
    if (!conversationKey) return;
    
    // ✅ CHỈ fetch nếu chưa có trong cache VÀ chưa từng fetch
    const hasCache = 
      messagesCache[conversationKey]?.length > 0 ||
      messagesSearchCache[conversationKey]?.length > 0;
    
    const alreadyFetched = fetchedConversationsRef.current.has(conversationKey);
    
    if (!hasCache && !alreadyFetched) {
      fetchMessages();
    }
  }, [conversationKey, messagesCache, messagesSearchCache, fetchMessages]);

  // ✅ REFACTOR: Fetch khi có messageIDSearch mới
  useEffect(() => {
    if (messageIDSearch && conversationKey) {
      fetchMessages();
    }
  }, [messageIDSearch, conversationKey, fetchMessages]);

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

  const clearSearchCache = useCallback(() => {
    if (!conversationKey) return;

    // Xóa search cache
    setMessagesSearchCache((prev) => {
      const updated = { ...prev };
      delete updated[conversationKey];
      return updated;
    });

    // Quay lại hiển thị main cache
    const mainCachedMsgs = messagesCache[conversationKey];
    if (mainCachedMsgs?.length) {
      setMessages(mainCachedMsgs);
      setIsShowingSearchCache(false);
      setHasMore(mainCachedMsgs.length >= limit);
    } else {
      // Nếu cache chính không có, tải lại từ đầu
      setMessages([]);
      setHasMore(true);
      fetchMessages();
    }

    setHighlightMessageId(null);
  }, [
    conversationKey,
    messagesCache,
    setMessagesSearchCache,
    limit,
    fetchMessages,
  ]);

  // Thêm / cập nhật pinned message vào state và sort theo pinned_at desc
  const upsertPinnedMessage = useCallback((p: PinnedMessageDetail) => {
    setPinnedMessages((prev) => {
      const foundIdx = prev.findIndex(
        (x) => x.pin_id === p.pin_id || x.message_id === p.message_id
      );
      let next;
      if (foundIdx >= 0) {
        next = [...prev];
        next[foundIdx] = { ...next[foundIdx], ...p };
      } else {
        next = [p, ...prev];
      }
      // Sort newest pinned_at first
      next.sort(
        (a, b) =>
          new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime()
      );
      return next;
    });
  }, []);

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

      // Nếu conversation chưa load (messagesCache trống)
      const isLoaded = messagesCache[msgKey]?.length > 0;
      if (!isLoaded) {
        // Thêm vào pending queue
        pendingRealtimeMessages.current[msgKey] = [
          ...(pendingRealtimeMessages.current[msgKey] || []),
          msg,
        ];
        return;
      }

      // Thêm vào cache chính
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
      messagesCache,
      user?.data.id,
      setMessagesCache,
    ]
  );

  const handleUpdateSeen = useCallback(
    (seenData: {
      last_seen_message_id?: string;
      receiver_id?: string;
      sender_id?: string;
    }) => {
      const { last_seen_message_id, receiver_id, sender_id } = seenData;
      // Reset unread_count
      setConversation((prevConversations) =>
        prevConversations.map((conv: Conversation) => {
          if (
            (conv.user_id && conv.user_id === receiver_id) ||
            (conv.group_id && conv.group_id === receiver_id)
          ) {
            return { ...conv, unread_count: 0 };
          }
          return conv;
        })
      );

      // Không có last_seen_message_id thì bỏ qua
      if (!last_seen_message_id) return;

      const seenConversationKey =
        sender_id === user?.data.id
          ? `user_${receiver_id}`
          : `user_${sender_id}`;

      // Hàm cập nhật status
      const updateStatus = (msgs: Messages[]) =>
        msgs.map((msg) =>
          msg.sender_id === user?.data.id &&
          isObjectIdLE(msg.id, last_seen_message_id)
            ? { ...msg, status: "seen", is_read: true }
            : msg
        );

      // Update cache
      setMessagesCache((prev) => {
        const cached = prev[seenConversationKey];
        if (!cached?.length) return prev;
        return { ...prev, [seenConversationKey]: updateStatus(cached) };
      });

      // Update messages đang hiển thị
      if (seenConversationKey === conversationKey) {
        setMessages((prev) => updateStatus(prev));
      }
    },
    [conversationKey, setMessagesCache, user?.data.id, setConversation]
  );

  const handleSelectPinnedMessage = useCallback(
    (messageId: string) => {
      setMessageIDSearch(messageId);
      setHighlightMessageId(messageId);
    },
    [setMessageIDSearch]
  );

  function isObjectIdLE(id1: string, id2: string) {
    return (
      new Date(parseInt(id1.substring(0, 8), 16) * 1000) <=
      new Date(parseInt(id2.substring(0, 8), 16) * 1000)
    );
  }

  useEffect(() => {
    if (!user?.data.id) return;
    socketManager.connect(user?.data.id);

    const listener = (data: ChatSocketEvent) => {
      switch (data.type) {
        case "pinned-message":
          // Backend gửi TOÀN BỘ danh sách pinned mới nhất (không phải chỉ 1 cái)
          // Hoặc nếu BE gửi từng cái → vẫn phải xử lý upsert đúng
          if (data.message) {
            const payload = data.message as
              | PinnedMessageDetail
              | PinnedMessageDetail[];

            if (Array.isArray(payload)) {
              // Trường hợp BE gửi cả list (tốt nhất)
              const sorted = payload.sort(
                (a, b) =>
                  new Date(b.pinned_at).getTime() -
                  new Date(a.pinned_at).getTime()
              );
              setPinnedMessages(sorted);
            } else {
              // Trường hợp BE chỉ gửi 1 cái → upsert
              upsertPinnedMessage(payload);
            }
          }
          break;

        case "un-pinned-message":
          if (data.message) {
            const payload = data.message as PinnedMessageDetail;

            // ĐÚNG: xóa theo message_id hoặc pin_id
            setPinnedMessages((prev) =>
              prev.filter(
                (p) =>
                  p.message_id !== payload.message_id &&
                  p.pin_id !== payload.pin_id
              )
            );
          }
          break;
        case "chat":
          if (data.message) {
            handleIncomingMessage(data.message as Messages);
          }
          break;
        case "update_seen":
          console.log("update_seen dưới BE gửi lên", data.message);
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

        case "recall-message":
          if (data.message) {
            const recalledMsg = data.message as Messages;

            // Update cache chính
            setMessagesCache((prev) => {
              const key =
                recalledMsg.group_id &&
                recalledMsg.group_id !== "000000000000000000000000"
                  ? `group_${recalledMsg.group_id}`
                  : `user_${
                      recalledMsg.sender_id === user?.data.id
                        ? recalledMsg.receiver_id
                        : recalledMsg.sender_id
                    }`;
              console.log("key", key);
              console.log("MessagesCache", messagesCache);

              if (!prev[key]) return prev;

              const updated = prev[key].map((msg) =>
                msg.id === recalledMsg.id
                  ? {
                      ...msg,
                      recalled_at: recalledMsg.recalled_at,
                      recalled_by: recalledMsg.recalled_by,
                    }
                  : msg
              );

              return { ...prev, [key]: updated };
            });
          }
      }
    };

    socketManager.addListener(listener);
    return () => socketManager.removeListener(listener);
  }, [
    user?.data.id,
    handleDeleteForMe,
    handleIncomingMessage,
    handleUpdateSeen,
    setMessagesCache,
    upsertPinnedMessage,
    messagesCache,
  ]);

  const lastSeenRef = useRef<{ [key: string]: string }>({});

  useEffect(() => {
    if (!messages.length || !selectedChat) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender_id === user?.data.id) return; // Không gửi seen cho tin nhắn của chính mình

    const conversationKey =
      selectedChat.group_id &&
      selectedChat.group_id !== "000000000000000000000000"
        ? `group_${selectedChat.group_id}`
        : `user_${selectedChat.user_id}`;

    if (lastSeenRef.current[conversationKey] === lastMsg.id) return; // Đã gửi rồi

    lastSeenRef.current[conversationKey] = lastMsg.id;

    socketManager.sendSeenMessage(
      lastMsg.id,
      selectedChat.group_id ? selectedChat.group_id : selectedChat.user_id,
      user?.data.id
    );
  }, [messages, selectedChat, user?.data.id]);

  if (!selectedChat) return <EmptyChatWindow />;

  const handleUnpinPinnedMessage = (messageId: string) => {
    setPinnedMessages((prev) =>
      prev.filter((msg) => msg.message_id !== messageId)
    );
  };
  
  return (
    <div className="flex flex-col w-full h-full max-h-screen bg-[#f5f7fb] text-[#1c2333]">
      <ChatHeaderWindow
        avatar={selectedChat.avatar}
        display_name={selectedChat.display_name ?? "không tên"}
        status={selectedChat.status}
        update_at={selectedChat.update_at}
        onBack={onBack}
      />

      <PinnedMessageBar
        pinned={pinnedMessages}
        onSelectPinned={handleSelectPinnedMessage}
        onUnpin={handleUnpinPinnedMessage}
        currentUserId={user?.data.id}
        receiver_id={selectedChat.user_id}
        group_id={selectedChat.group_id}
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
        isShowingSearchCache={isShowingSearchCache}
        onClearSearchCache={clearSearchCache}
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