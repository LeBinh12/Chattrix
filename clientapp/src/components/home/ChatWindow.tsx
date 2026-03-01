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
import type { Task } from "../../api/taskApi";
import { videoCallState } from "../../recoil/atoms/videoCallAtom";
import { activeCallsAtom } from "../../recoil/atoms/activeCallsAtom";
import type { TaskComment } from "../../types/task-comment";
import { taskCommentsAtom } from "../../recoil/atoms/taskComment";
import {
  groupMembersAtom,
  groupTotalMembersAtom,
} from "../../recoil/atoms/groupAtom";
import { threadTargetAtom } from "../../recoil/atoms/uiAtom";
import type { GroupMember, GroupRole } from "../../types/group-member";

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
  | {
    type: "group_member_added";
    message: { group_id: string; members: GroupMember[]; total_members?: number };
  }
  | { type: "group_member_removed"; message: { group_id: string; user_id: string } }
  | { type: "group_member_promoted"; payload: { group_id: string; user_id: string; role: string } }
  | { type: string; message: any }
  | { type: "pinned-message"; message: Messages | PinnedMessageDetail }
  | { type: "un-pinned-message"; message: Messages | PinnedMessageDetail }
  | { type: "recall-message"; message: Messages }
  | { type: "rep-task"; message: Messages & { task?: Task } }
  | { type: "rep-task"; message: Messages & { task?: Task } }
  | { type: "account_deleted"; message: string; payload?: string }
  | { type: "video-call"; message: any }
  | {
    type: "reaction_update";
    message: {
      type: "add" | "remove" | "remove_all";
      message_id: string;
      user_id: string;
      user_name: string;
      emoji: string;
    };
  }
  | {
    type: "task_comment";
    message: TaskComment;
  }
  | {
    type: "edit_message_update";
    id: string;
    content: string;
    edited_at: string;
  };
type ChatWindowProps = {
  onBack?: () => void;
};

export default function ChatWindow({ onBack }: ChatWindowProps) {
  const selectedChat = useRecoilValue(selectedChatState);
  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const user = useRecoilValue(userAtom);
  const setCommentsCache = useSetRecoilState(taskCommentsAtom);
  const [messages, setMessages] = useState<Messages[]>([]);
  const [messagesCache, setMessagesCache] = useRecoilState(messagesCacheAtom);
  const [messagesSearchCache, setMessagesSearchCache] = useRecoilState(
    messagesSearchCacheAtom
  );
  const setConversation = useSetRecoilState(conversationListAtom);
  const setGroupMembersMap = useSetRecoilState(groupMembersAtom);
  const setGroupTotalMembers = useSetRecoilState(groupTotalMembersAtom);
  const setThreadTarget = useSetRecoilState(threadTargetAtom);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [isLoadingMoreSearch, setIsLoadingMoreSearch] = useState(false);
  const [hasMoreSearch, setHasMoreSearch] = useState(true);

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

  // Video Call State
  const [callState, setCallState] = useRecoilState(videoCallState);
  const isCalling = callState.isCalling;

  // ✅ Add ref to track fetched conversations
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
        // Sort by pinned_at desc to put newest messages first
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

  // ✅ REFACTOR: fetchMessages - ONLY set loading when actually calling the API
  const fetchMessages = useCallback(async () => {
    if (!user?.data.id || !conversationKey) return;

    // If messageIDSearch exists, handle search
    if (messageIDSearch) {
      // Check search cache first (higher priority)
      const searchCachedMsgs = messagesSearchCache[conversationKey];
      const foundInSearchCache = searchCachedMsgs?.find(
        (msg) => msg.id === messageIDSearch
      );

      if (foundInSearchCache) {
        // Message already in search cache - show search cache
        setMessages(searchCachedMsgs);
        setHighlightMessageId(messageIDSearch);
        setIsShowingSearchCache(true);
        setMessageIDSearch("");
        return;
      }

      // Check main cache next
      const cachedMsgs = messagesCache[conversationKey];
      const foundInMainCache = cachedMsgs?.find(
        (msg) => msg.id === messageIDSearch
      );

      if (foundInMainCache) {
        // Message already in main cache - show main cache
        setMessages(cachedMsgs);
        setHighlightMessageId(messageIDSearch);
        setIsShowingSearchCache(false);
        setMessageIDSearch("");
        return;
      }

      // ✅ ONLY TURN ON LOADING WHEN CALLING API
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

          // Save to search cache instead of main cache
          setMessagesSearchCache((prev) => ({
            ...prev,
            [conversationKey]: sorted,
          }));
          setMessages(sorted);
          setHighlightMessageId(messageIDSearch);
          setIsShowingSearchCache(true);
          setHasMore(sorted.length >= limit);
          setHasMoreSearch(sorted.length >= limit);
        } else {
          toast.warning("Tin nhắn này đã được bạn xóa!");
        }
      } catch (error: unknown) {
        // Handle error
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

    // ✅ ONLY TURN ON LOADING WHEN CALLING API AND NO CACHE AVAILABLE
    try {
      beginInitialLoading();
      const res = await messageAPI.getMessage(
        selectedChat?.user_id ?? "",
        selectedChat?.group_id ?? "",
        limit
      );

      let sorted: Messages[] = (res.data.data || []).sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ).filter(m => !m.parent_id);

      // ✅ Merge with pending messages (realtime arrived during fetch)
      const pending = pendingRealtimeMessages.current[conversationKey];
      if (pending && pending.length > 0) {
        const pendingIds = new Set(pending.map(m => m.id));
        sorted = [...sorted, ...pending.filter(m => !pendingIds.has(m.id))];
        // Re-sort to ensure chronological order
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        // Delete pending after merging
        delete pendingRealtimeMessages.current[conversationKey];
      }

      setMessagesCache((prev) => ({
        ...prev,
        [conversationKey]: sorted,
      }));
      setMessages(sorted);
      setIsShowingSearchCache(false);
      loadedCountRef.current[conversationKey] = sorted.length;
      setHasMore(sorted.length >= limit);

      // ✅ Mark conversation as fetched
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
    setPinnedMessages([]); // Clear immediately when switching chats
    if (selectedChat) {
      fetchPinnedMessages();
    }
  }, [selectedChat, fetchPinnedMessages]);

  // ✅ REFACTOR: Reset messages - DO NOT turn on loading, only reset state
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      setHasMore(true);
      setHasLeftGroup(false);
      setHighlightMessageId(null);
      setIsShowingSearchCache(false);
      // ✅ ADD: Reset all loading states
      setIsLoadingMore(false);
      setIsLoadingMoreSearch(false);
      setHasMoreSearch(true);
      return;
    }

    setMessages([]);

    // Prioritize search cache if available
    const searchCachedMsgs = messagesSearchCache[conversationKey];
    if (searchCachedMsgs?.length && !messageIDSearch) {
      setMessages(searchCachedMsgs);
      setIsShowingSearchCache(true);
      setHasMoreSearch(searchCachedMsgs.length >= limit);
    } else {
      const mainCachedMsgs = messagesCache[conversationKey];
      if (mainCachedMsgs?.length && !messageIDSearch) {
        setMessages(mainCachedMsgs);
        setIsShowingSearchCache(false);
        setHasMore(mainCachedMsgs.length >= limit);
      }
    }

    setHasLeftGroup(false);
    setIsLoadingMore(false);
    setIsLoadingMoreSearch(false);
  }, [
    selectedChat,
    messageIDSearch,
    messagesSearchCache,
    messagesCache,
    conversationKey,
    limit, // ✅ Thêm dependency
  ]);

  // ✅ REFACTOR: ONLY call fetchMessages when no cache exists
  useEffect(() => {
    if (!conversationKey) return;

    // ✅ ONLY fetch if not in cache AND never fetched before
    const hasCache =
      messagesCache[conversationKey]?.length > 0 ||
      messagesSearchCache[conversationKey]?.length > 0;

    const alreadyFetched = fetchedConversationsRef.current.has(conversationKey);

    if (!hasCache && !alreadyFetched) {
      fetchMessages();
    }
  }, [conversationKey, messagesCache, messagesSearchCache, fetchMessages]);

  // ✅ REFACTOR: Fetch when there is a new messageIDSearch
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

      const newMessages: Messages[] = (res.data.data || [])
        .filter((m: Messages) => !m.parent_id)
        .sort(
          (a: Messages, b: Messages) =>
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

  // ✅ ADD: Load more for search cache
  const loadMoreSearchMessages = async () => {
    // ✅ Add conversationKey check
    if (
      !selectedChat ||
      !conversationKey ||
      isLoadingMoreSearch ||
      !hasMoreSearch
    )
      return;

    try {
      setIsLoadingMoreSearch(true);

      // ✅ Lấy tin nhắn từ search cache, không phải từ messages hiển thị
      const searchMessages = messagesSearchCache[conversationKey];

      // ✅ Phải có ít nhất 1 tin nhắn trong search cache
      if (!searchMessages?.length) {
        setHasMoreSearch(false);
        return;
      }

      const beforeTime = searchMessages[0].created_at;

      console.log("🔍 Loading more search messages, before:", beforeTime);

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

      console.log("📦 Received search messages:", newMessages.length);

      if (!newMessages.length) {
        setHasMoreSearch(false);
        return;
      }

      // Cập nhật search cache
      setMessagesSearchCache((prev) => {
        const combined = [...newMessages, ...(prev[conversationKey] || [])];
        const unique = combined.filter(
          (msg, index, self) => self.findIndex((m) => m.id === msg.id) === index
        );
        console.log("✅ Updated search cache, total:", unique.length);
        return { ...prev, [conversationKey]: unique };
      });

      // Cập nhật messages đang hiển thị
      setMessages((prev) => {
        const combined = [...newMessages, ...prev];
        return combined.filter(
          (msg, index, self) => self.findIndex((m) => m.id === msg.id) === index
        );
      });

      setHasMoreSearch(newMessages.length >= limit);
    } catch (err) {
      console.error("Lỗi khi tải thêm tin nhắn tìm kiếm:", err);
      setHasMoreSearch(false); // ✅ Set false khi có lỗi
    } finally {
      setIsLoadingMoreSearch(false);
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

    // ✅ Reset search loading states
    setIsLoadingMoreSearch(false);
    setHasMoreSearch(true);

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

      // ✅ QUAN TRỌNG: Reset hasMore dựa trên số lượng tin nhắn trong main cache
      setHasMore(mainCachedMsgs.length >= limit);

      // ✅ Reset isLoadingMore nếu đang load
      setIsLoadingMore(false);
    } else {
      // Nếu cache chính không có, tải lại từ đầu
      setMessages([]);
      setHasMore(true);
      setIsLoadingMore(false);
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

  // Add / update pinned message in state and sort by pinned_at desc
  const upsertPinnedMessage = useCallback((p: PinnedMessageDetail) => {
    setPinnedMessages((prev) => {
      // Find by message_id (most reliable for uniqueness of what is pinned)
      const foundIdx = prev.findIndex(
        (x) => x.message_id === p.message_id
      );
      let next;
      if (foundIdx >= 0) {
        next = [...prev];
        // Merge existing with new, prioritizing new data
        next[foundIdx] = { ...next[foundIdx], ...p };
      } else {
        next = [p, ...prev];
      }
      
      // Sort newest pinned_at first
      next.sort((a, b) => {
        const dateA = new Date(a.pinned_at || a.created_at).getTime();
        const dateB = new Date(b.pinned_at || b.created_at).getTime();
        return dateB - dateA;
      });
      return next;
    });
  }, []);

  // const handleIncomingMessage = useCallback(
  //   (msg: Messages) => {
  //     if (!msg) return;
  //     const msgKey =
  //       msg.group_id && msg.group_id !== "000000000000000000000000"
  //         ? `group_${msg.group_id}`
  //         : `user_${
  //             msg.sender_id === user?.data.id ? msg.receiver_id : msg.sender_id
  //           }`;

  //     if (msg.sender_id !== user?.data.id) playNotificationSound();

  //     // If conversation not loaded (messagesCache empty)
  //     const isLoaded = messagesCache[msgKey]?.length > 0;
  //     if (!isLoaded) {
  //       // Thêm vào pending queue
  //       pendingRealtimeMessages.current[msgKey] = [
  //         ...(pendingRealtimeMessages.current[msgKey] || []),
  //         msg,
  //       ];
  //       return;
  //     }

  //     // Add to main cache
  //     setMessagesCache((prev) => {
  //       const oldMessages = prev[msgKey] || [];
  //       if (oldMessages.some((m) => m.id === msg.id)) return prev;
  //       return { ...prev, [msgKey]: [...oldMessages, msg] };
  //     });

  //     if (msgKey === conversationKey) {
  //       setMessages((prev) => {
  //         if (prev.some((m) => m.id === msg.id)) return prev;
  //         return [...prev, msg];
  //       });
  //     }

  //     if (
  //       msg.type === "system" &&
  //       msg.sender_id === user?.data.id &&
  //       msg.group_id === selectedChat?.group_id
  //     ) {
  //       setHasLeftGroup(true);
  //     }
  //   },
  //   [  
  //     conversationKey,
  //     playNotificationSound,
  //     selectedChat?.group_id,
  //     messagesCache,
  //     user?.data.id,
  //     setMessagesCache,
  //   ]
  // );


  const handleIncomingMessage = useCallback(
    (msg: Messages) => {
      if (!msg) return;

      // 🔽 XỬ LÝ CẬP NHẬT COMMENT COUNT REALTIME
      if (msg.parent_id) {
        // 1. Cập nhật state messages hiện tại
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.parent_id
              ? { ...m, comment_count: (m.comment_count || 0) + 1 }
              : m
          )
        );

        // 2. Xác định key hội thoại để cập nhật cache
        const msgKey =
          msg.group_id && msg.group_id !== "000000000000000000000000"
            ? `group_${msg.group_id}`
            : `user_${msg.sender_id === user?.data.id ? msg.receiver_id : msg.sender_id}`;

        // 3. Cập nhật cache chính
        setMessagesCache((prev) => {
          if (!prev[msgKey]) return prev;
          return {
            ...prev,
            [msgKey]: prev[msgKey].map((m) =>
              m.id === msg.parent_id
                ? { ...m, comment_count: (m.comment_count || 0) + 1 }
                : m
            ),
          };
        });

        // 4. Cập nhật search cache nếu đang hiển thị
        setMessagesSearchCache((prev) => {
          if (!prev[msgKey]) return prev;
          return {
            ...prev,
            [msgKey]: prev[msgKey].map((m) =>
              m.id === msg.parent_id
                ? { ...m, comment_count: (m.comment_count || 0) + 1 }
                : m
            ),
          };
        });

        // Nếu là comment thì không thêm vào luồng chính, dừng tại đây
        return;
      }

      const msgKey =
        msg.group_id && msg.group_id !== "000000000000000000000000"
          ? `group_${msg.group_id}`
          : `user_${msg.sender_id === user?.data.id
            ? msg.receiver_id
            : msg.sender_id
          }`;

      if (msg.sender_id !== user?.data.id && msg.type !== "system") {
        playNotificationSound();
      }

      // ✅ Kiểm tra xem conversation đã được fetch hay chưa
      const isFetched = fetchedConversationsRef.current.has(msgKey) || (messagesCache[msgKey]?.length > 0);

      if (!isFetched) {
        // Đưa vào pending queue để fetchMessages gộp sau
        console.log(`[Queue] Tin nhắn mới cho ${msgKey} được đưa vào hàng chờ.`);
        pendingRealtimeMessages.current[msgKey] = [
          ...(pendingRealtimeMessages.current[msgKey] || []),
          msg,
        ];
        return;
      }

      // ✅ Đã fetch rồi thì add trực tiếp vào cache
      setMessagesCache((prev) => {
        const oldMessages = prev[msgKey] || [];
        if (oldMessages.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          [msgKey]: [...oldMessages, msg],
        };
      });

      // ✅ Nếu đang mở conversation
      if (msgKey === conversationKey) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      // ✅ System message xử lý riêng
      if (msg.type === "system") {
        if (msg.system_action === "leave" &&
            msg.sender_id === user?.data.id &&
            msg.group_id === selectedChat?.group_id) {
          setHasLeftGroup(true);
        } else if (msg.system_action === "ownership_transferred") {
          const groupId = msg.group_id;
          const oldOwnerId = msg.old_owner_id;
          const newOwnerId = msg.new_owner_id;

          if (groupId && oldOwnerId && newOwnerId) {
            setGroupMembersMap((prev) => {
              const currentMembers = prev[groupId];
              if (!currentMembers) return prev;

              return {
                ...prev,
                [groupId]: currentMembers.map(m => {
                  if (m.user_id === oldOwnerId) return { ...m, role: "member" as GroupRole, role_info: undefined };
                  if (m.user_id === newOwnerId) return { ...m, role: "owner" as GroupRole, role_info: undefined };
                  return m;
                })
              };
            });

            if (newOwnerId === user?.data.id) {
              toast.success("Bạn đã trở thành Trưởng nhóm mới!");
            }
          }
        }
      }
    },
    [
      conversationKey,
      playNotificationSound,
      selectedChat?.group_id,
      user?.data.id,
      setMessagesCache,
      messagesCache,
      setGroupMembersMap,
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
        receiver_id === user?.data.id
          ? `user_${sender_id}`
          : `group_${receiver_id}`;

      // Status update function
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

      // Update currently displayed messages
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
    if (id1 === id2) return true;
    const t1 = parseInt(id1.substring(0, 8), 16);
    const t2 = parseInt(id2.substring(0, 8), 16);
    return t1 <= t2;
  }

  useEffect(() => {
    if (!user?.data.id) return;
    socketManager.connect(user?.data.id);

    const listener = (data: ChatSocketEvent) => {
      switch (data.type) {
        case "task_comment": {
          if (data.message) {
            const payload = data.message as TaskComment;
            setCommentsCache(prev => {
              const taskId = payload.task_id;

              // ❌ task not loaded -> ignore (correct cache strategy)
              if (!prev[taskId]) return prev;

              const comments = prev[taskId];

              switch (payload.type_act) {

                /* ================= CREATE ================= */
                case "created": {
                  const exists = comments.some(c => c.id === payload.id);
                  if (exists) return prev;

                  return {
                    ...prev,
                    [taskId]: [...comments, payload as TaskComment],
                  };
                }

                /* ================= UPDATE ================= */
                case "updated": {
                  const updatedAt = payload.updated_at ?? new Date().toISOString();

                  return {
                    ...prev,
                    [taskId]: comments.map((c) => {
                      // ✅ Update original comment
                      if (c.id === payload.id) {
                        return {
                          ...c,
                          content: payload.content,
                          updated_at: updatedAt,
                        };
                      }

                      // ✅ Update reply_to_content for reply
                      if (c.reply_to_id === payload.id) {
                        return {
                          ...c,
                          reply_to_content: payload.content,
                          updated_at: updatedAt,
                        };
                      }

                      return c;
                    }),
                  };
                }


                /* ================= DELETE ================= */
                case "deleted": {
                  return {
                    ...prev,
                    [taskId]: comments.filter(c => c.id !== payload.id),
                  };
                }

                default:
                  return prev;
              }
            });
          }
          break
        }
        case "rep-task": {
          const msg = data.message as Messages;
          const updatedTask = msg?.task;
          if (!updatedTask?.id) {
            console.warn("rep-task received without task.id");
            break;
          }

          setMessagesCache((prevCache) => {
            const newCache = { ...prevCache };

            let hasUpdated = false;

            // Iterate through all chats (group_id or receiver_id as key)
            Object.keys(newCache).forEach((chatKey) => {
              const messages = newCache[chatKey];
              if (!messages || messages.length === 0) return;

              let messagesUpdated = false;
              const updatedMessages = messages.map((msg): Messages => {
                // Only handle task types with matching task.id
                if (msg.type === "task" && msg.task?.id === updatedTask.id) {
                  messagesUpdated = true;
                  hasUpdated = true;

                  return {
                    ...msg,
                    task: {
                      ...msg.task,
                      ...updatedTask,
                    } as Task,
                  };
                }
                return msg;
              });

              if (messagesUpdated) {
                newCache[chatKey] = updatedMessages;
              }
            });

            if (hasUpdated) {
              console.log(
                `Task ${updatedTask.id} updated to status: ${updatedTask.status}`
              );
            }

            return newCache;
          });

          break;
        }
        case "pinned-message":
          if (data.message) {
            console.log("pinned-message received", data.message);
            const payload = data.message as
              | PinnedMessageDetail
              | PinnedMessageDetail[];
            
            const isRelevant = (p: PinnedMessageDetail) => {
              const currentChat = selectedChatRef.current;
              const isGroupPin = p.group_id && p.group_id !== "000000000000000000000000";

              return (
                // Group chat
                (isGroupPin &&
                  currentChat?.group_id &&
                  p.group_id === currentChat.group_id) ||

                // 1-1 chat (ưu tiên conversation_id nếu có)
                (!isGroupPin &&
                  currentChat?.conversation_id &&
                  p.conversation_id === currentChat.conversation_id) ||

                // Fallback nếu backend chưa gửi conversation_id
                (!isGroupPin &&
                  currentChat?.user_id &&
                  (p.receiver_id === currentChat.user_id ||
                  p.sender_id === currentChat.user_id ||
                  p.pinned_by_id === currentChat.user_id))
              );
            };

            if (Array.isArray(payload)) {
              const relevant = payload.filter(isRelevant);
              const sorted = relevant.sort(
                (a, b) =>
                  new Date(b.pinned_at).getTime() -
                  new Date(a.pinned_at).getTime()
              );
              setPinnedMessages(sorted);
            } else {
              if (isRelevant(payload)) {
                upsertPinnedMessage(payload);
              }
            }
          }
          break;

        case "un-pinned-message":
          if (data.message) {
            console.log("un-pinned-message", data.message);
            const payload = data.message as PinnedMessageDetail;
            const currentChat = selectedChatRef.current;

            const isGroupPin = payload.group_id && payload.group_id !== "000000000000000000000000";
            const isRelevant = 
              (currentChat?.group_id && isGroupPin && payload.group_id === currentChat.group_id) ||
              (currentChat?.user_id && !isGroupPin && (payload.pinned_by_id === currentChat.user_id || payload.receiver_id === currentChat.user_id));

            if (isRelevant) {
              setPinnedMessages((prev) =>
                prev.filter(
                  (p) =>
                    p.message_id !== payload.message_id
                )
              );
            }
          }
          break;
        case "chat":

          if (data.message) {
            console.log("message", data.message);
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

        case "edit_message_update": {
          const payload = (data as any).payload as { id: string; content: string; edited_at: string };
          if (payload && payload.id) {
            const updateMsg = (m: Messages): Messages => 
              m.id === payload.id ? { ...m, content: payload.content, edited_at: payload.edited_at } : m;

            setMessages((prev) => prev.map(updateMsg));
            
            setMessagesCache((prev) => {
              const updated = { ...prev };
              Object.keys(updated).forEach(key => {
                 updated[key] = updated[key].map(updateMsg);
              });
              return updated;
            });

            setMessagesSearchCache((prev) => {
              const updated = { ...prev };
              Object.keys(updated).forEach(key => {
                 updated[key] = updated[key].map(updateMsg);
              });
              return updated;
            });

            setPinnedMessages(prev => prev.map(p => 
              p.message_id === payload.id ? { ...p, content: payload.content } : p
            ));

            setThreadTarget((prev) => 
              prev?.id === payload.id ? { ...prev, content: payload.content, edited_at: payload.edited_at } : prev
            );
          }
          break;
        }
        case "recall-message":
          if (data.message) {
            const recalledMsg = data.message as Messages;

            // 🔽 1. Nếu là comment bị thu hồi -> Giảm comment_count của cha
            if (recalledMsg.parent_id) {
              const decrementCount = (m: Messages) =>
                m.id === recalledMsg.parent_id
                  ? { ...m, comment_count: Math.max(0, (m.comment_count || 0) - 1) }
                  : m;

              setMessages((prev) => prev.map(decrementCount));
              
              setMessagesCache((prev) => {
                const updated = { ...prev };
                Object.keys(updated).forEach(key => {
                   updated[key] = updated[key].map(decrementCount);
                });
                return updated;
              });

              setMessagesSearchCache((prev) => {
                const updated = { ...prev };
                Object.keys(updated).forEach(key => {
                   updated[key] = updated[key].map(decrementCount);
                });
                return updated;
              });
            }

            // 🔽 2. Cập nhật trạng thái "đã thu hồi" cho chính tin nhắn đó
            const updateRecalled = (m: Messages) =>
              m.id === recalledMsg.id
                ? {
                    ...m,
                    recalled_at: recalledMsg.recalled_at,
                    recalled_by: recalledMsg.recalled_by,
                    content: "", // Xóa nội dung hiển thị
                  }
                : m;

            setMessages((prev) => prev.map(updateRecalled));

            setMessagesCache((prev) => {
              const updated = { ...prev };
              Object.keys(updated).forEach(key => {
                updated[key] = updated[key].map(updateRecalled);
              });
              return updated;
            });

            setMessagesSearchCache((prev) => {
               const updated = { ...prev };
               Object.keys(updated).forEach(key => {
                 updated[key] = updated[key].map(updateRecalled);
               });
               return updated;
            });
          }
          break;
        case "reaction_update": {
          if (data.message) {
            const payload = data.message as {
              type: "add" | "remove" | "remove_all";
              message_id: string;
              user_id: string;
              user_name: string;
              emoji: string;
            };

            // Update messages state
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== payload.message_id) return msg;

                let newReactions = msg.reactions ? [...msg.reactions] : [];

                if (payload.type === "add") {
                  if (
                    !newReactions.some(
                      (r) =>
                        r.user_id === payload.user_id && r.emoji === payload.emoji
                    )
                  ) {
                    newReactions.push({
                      user_id: payload.user_id,
                      user_name: payload.user_name,
                      emoji: payload.emoji,
                    });
                  }
                }
                else if (payload.type === "remove") {
                  newReactions = newReactions.filter(
                    (r) =>
                      !(
                        r.user_id === payload.user_id &&
                        r.emoji === payload.emoji
                      )
                  );
                }

                else if (payload.type === "remove_all") {
                  newReactions = newReactions.filter(
                    (r) => r.user_id !== payload.user_id
                  );
                }


                return { ...msg, reactions: newReactions };
              })
            );

            // Update cache
            setMessagesCache((prev) => {
              const newCache = { ...prev };
              let hasChange = false;
              for (const key of Object.keys(newCache)) {
                const msgs = newCache[key];
                if (msgs.some((m) => m.id === payload.message_id)) {
                  newCache[key] = msgs.map((msg) => {
                    if (msg.id !== payload.message_id) return msg;

                    hasChange = true;
                    let newReactions = msg.reactions ? [...msg.reactions] : [];
                    if (payload.type === "add") {
                      if (
                        !newReactions.some(
                          (r) =>
                            r.user_id === payload.user_id && r.emoji === payload.emoji
                        )
                      ) {
                        newReactions.push({
                          user_id: payload.user_id,
                          user_name: payload.user_name,
                          emoji: payload.emoji,
                        });
                      }
                    }

                    else if (payload.type === "remove") {
                      newReactions = newReactions.filter(
                        (r) =>
                          !(
                            r.user_id === payload.user_id &&
                            r.emoji === payload.emoji
                          )
                      );
                    }

                    else if (payload.type === "remove_all") {
                      newReactions = newReactions.filter(
                        (r) => r.user_id !== payload.user_id
                      );
                    }

                    return { ...msg, reactions: newReactions };
                  });
                }
              }
              return hasChange ? newCache : prev;
            });
          }
          break;
        }
        case "group_member_removed": {
          if (data.message) {
            const payload = data.message as { group_id: string; user_id: string };
            
            // Sync group members list and total
            setGroupMembersMap((prev) => {
              const currentMembers = prev[payload.group_id] || [];
              return {
                ...prev,
                [payload.group_id]: currentMembers.filter(m => m.user_id !== payload.user_id)
              };
            });
            
            setGroupTotalMembers((prev) => ({
              ...prev,
              [payload.group_id]: Math.max(0, (prev[payload.group_id] || 0) - 1)
            }));

            if (payload.user_id === user?.data.id && payload.group_id === selectedChat?.group_id) {
              setHasLeftGroup(true);
              toast.info("Bạn đã bị xóa khỏi nhóm");
            }
          }
          break;
        }

        case "group_member_added": {
          if (data.message) {
            const payload = data.message as { group_id: string; members: GroupMember[]; total_members?: number };
            const isMeAdded = payload.members.some(m => m.user_id === user?.data.id);

            if (isMeAdded) {
              // If I am added, clear the cache for this group to force a full fetch from API
              // This is because the socket payload only contains the newly added members
              setGroupMembersMap((prev) => {
                const newState = { ...prev };
                delete newState[payload.group_id];
                return newState;
              });
            } else {
              let addedCount = 0;
              setGroupMembersMap((prev) => {
                const currentMembers = prev[payload.group_id] || [];
                const newMembers = payload.members.filter(
                  (newMem) => !currentMembers.some((m) => m.user_id === newMem.user_id)
                );

                if (newMembers.length === 0) return prev;
                addedCount = newMembers.length;

                return {
                  ...prev,
                  [payload.group_id]: [...currentMembers, ...newMembers]
                };
              });

              if (payload.total_members) {
                setGroupTotalMembers((prev) => ({
                  ...prev,
                  [payload.group_id]: payload.total_members!
                }));
              } else {
                setGroupTotalMembers((prev) => {
                  const currentTotal = prev[payload.group_id] || 0;
                  return {
                    ...prev,
                    [payload.group_id]: currentTotal + addedCount
                  };
                });
              }
            }
          }
          break;
        }
        case "group_member_promoted": {
          const payload = (data as any).payload as { group_id: string; user_id: string; role: string };
          if (payload) {
            // Update member map in real-time
            setGroupMembersMap((prev) => {
              const currentMembers = prev[payload.group_id];
              if (!currentMembers) return prev;

              return {
                ...prev,
                [payload.group_id]: currentMembers.map(m =>
                  m.user_id === payload.user_id ? { ...m, role: payload.role as GroupRole } : m
                )
              };
            });

            if (payload.user_id === user?.data.id) {
              toast.info(`Bạn vừa được chỉ định làm ${payload.role === 'admin' ? 'Quản trị viên' : 'Trưởng nhóm'} mới của nhóm!`);
            }
          }
          break;
        }

        case "group_ownership_transferred": {
          const payload = (data as any).payload as { group_id: string; old_owner_id: string; new_owner_id: string };
          if (payload) {
            setGroupMembersMap((prev) => {
              const currentMembers = prev[payload.group_id];
              if (!currentMembers) return prev;

              return {
                ...prev,
                [payload.group_id]: currentMembers.map(m => {
                  if (m.user_id === payload.old_owner_id) return { ...m, role: "member" as GroupRole, role_info: undefined };
                  if (m.user_id === payload.new_owner_id) return { ...m, role: "owner" as GroupRole, role_info: undefined };
                  return m;
                })
              };
            });

            if (payload.new_owner_id === user?.data.id) {
              toast.success("Bạn đã trở thành Trưởng nhóm mới!");
            }
          }
          break;
        }
      }
    };

    socketManager.addListener(listener as any);
    return () => socketManager.removeListener(listener as any);
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

    // Find last message from others (not self and not system)
    let lastPartnerMsg: Messages | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (
        messages[i].sender_id !== user?.data.id &&
        messages[i].type !== "system"
      ) {
        lastPartnerMsg = messages[i];
        break;
      }
    }

    if (!lastPartnerMsg) return;

    const conversationKey =
      selectedChat.group_id &&
      selectedChat.group_id !== "000000000000000000000000"
        ? `group_${selectedChat.group_id}`
        : `user_${selectedChat.user_id}`;

    if (lastSeenRef.current[conversationKey] === lastPartnerMsg.id) return; // Already sent

    lastSeenRef.current[conversationKey] = lastPartnerMsg.id;

    socketManager.sendSeenMessage(
      lastPartnerMsg.id,
      selectedChat.group_id &&
      selectedChat.group_id !== "000000000000000000000000"
        ? selectedChat.group_id
        : selectedChat.user_id,
      user?.data.id
    );
  }, [messages, selectedChat, user?.data.id]);

  // if (!selectedChat) return <EmptyChatWindow />;

  const handleUnpinPinnedMessage = (messageId: string) => {
    setPinnedMessages((prev) =>
      prev.filter((msg) => msg.message_id !== messageId)
    );
  };

  const toggleVideoCall = useCallback(() => {
    if (isCalling) {
      setCallState((prev) => ({ ...prev, isCalling: false, roomId: null, chatId: null, chatType: null }));
    } else {
      if (!selectedChat || !user?.data.id) return;

      let roomName = "";
      const isGroupChat = !!selectedChat.group_id && selectedChat.group_id !== "000000000000000000000000";

      if (isGroupChat) {
        roomName = `room_${selectedChat.group_id}`;
      } else {
        // 1-1 Chat: Sort 2 user IDs to create same room name for both sides
        const otherId = selectedChat.user_id || "";
        const myId = user.data.id;
        const ids = [myId, otherId].sort();
        roomName = `room_${ids.join("_")}`;
      }

      // const participantName = user?.data.display_name || user?.data.username || "Guest";

      // Removed local fetchToken, auto handled by App.tsx global watcher


      setCallState({
        isCalling: true,
        roomId: roomName,
        chatId: isGroupChat ? selectedChat.group_id! : selectedChat.user_id!,
        chatType: isGroupChat ? "group" : "user",
      });
    }
  }, [isCalling, selectedChat, user?.data, setCallState]);

  // Removed Auto-Join logic, now global in App.tsx

  const activeCalls = useRecoilValue(activeCallsAtom);
  const isActiveCallInRoom = selectedChat ? (
    (!!selectedChat.group_id && activeCalls[selectedChat.group_id]) ||
    (!!selectedChat.user_id && activeCalls[selectedChat.user_id])
  ) : false;

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-[#f5f7fb] text-[#1c2333]">
      {
        !selectedChat ? (
          <EmptyChatWindow />
        ) : (
          <>
            <ChatHeaderWindow
              display_name={selectedChat?.display_name || ""}
              avatar={selectedChat?.avatar}
              onBack={onBack}
              status={selectedChat?.status || "offline"}
              update_at={selectedChat?.update_at}
              receiver_id={selectedChat?.user_id}
              group_id={selectedChat?.group_id}
              isDeleted={selectedChat?.status === "deleted"}
              onToggleCall={toggleVideoCall}
              isCalling={isCalling}
              isActiveCallInRoom={isActiveCallInRoom}
            />

            {/* VideoCallModal moved to App.tsx */}

            <div className="flex-1 flex flex-col min-h-0 relative">

              <PinnedMessageBar
                pinned={pinnedMessages}
                onSelectPinned={handleSelectPinnedMessage}
                onUnpin={handleUnpinPinnedMessage}
                currentUserId={user?.data.id}
                receiver_id={selectedChat.user_id}
                group_id={selectedChat.group_id}
              />

              <ChatContentWindow
                key={conversationKey}
                conversationKey={conversationKey}
                display_name={selectedChat.display_name ?? "không tên"}
                currentUserId={user?.data.id}
                messages={messages}
                loadMoreMessages={
                  isShowingSearchCache ? loadMoreSearchMessages : loadMoreMessages
                } // ✅ Use appropriate function
                isLoadingMore={
                  isShowingSearchCache ? isLoadingMoreSearch : isLoadingMore
                }
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
                isDeleted={selectedChat.is_deleted}
              />
            </div>
          </>
        )
      }
    </div >
  );
}
