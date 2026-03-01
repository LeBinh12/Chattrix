import { ChevronDown, Search, Users, UserPlus, MessageSquareText, X, Bell, PanelLeftOpen } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { conversationApi } from "../../api/conversation";
import { TING } from "../../assets/paths";
import type { Conversation } from "../../types/conversation";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import UserAvatar from "../UserAvatar";
import { userAtom } from "../../recoil/atoms/userAtom";
import { socketManager } from "../../api/socket";
import { Howl } from "howler";
import { userApi } from "../../api/userApi";
import { groupModalAtom, sidebarCollapsedAtom } from "../../recoil/atoms/uiAtom";
import TimeAgo from "javascript-time-ago";
import vi from "javascript-time-ago/locale/vi.json";
import CreateGroupModal from "../group/CreateGroup";
import ChatSkeletonList from "../../skeleton/ChatSkeletonList";
import { conversationListAtom } from "../../recoil/atoms/conversationListAtom";
import { motion } from "framer-motion";
import { BUTTON_HOVER } from "../../utils/className";
import { groupMembersAtom } from "../../recoil/atoms/groupAtom";
// import { BUTTON_HOVER } from "../../utils/className";

TimeAgo.addDefaultLocale(vi);
const timeAgo = new TimeAgo("vi-VN");

const ding = new Howl({
  src: [TING],
  preload: true,
  volume: 0.8,
});

interface ChannelListProps {
  width: number;
}

type ConversationSocketData = {
  type?: string;
  message?: {
    receiver_id?: string;
    group_id?: string;
    user_id?: string;
    display_name?: string;
    avatar?: string;
    last_message_id: string;
    last_message?: string;
    last_message_type?: string;
    sender_id?: string;
    recalled_by?: string;
    recalled_at: string;
    updated_at?: string;
    last_date?: string;
    id?: string;
    conversation_id?: string;
    parent_id?: string;
  };
  user_id?: string;
  status?: Conversation["status"];
};

const TAG_TYPES = [
  {
    value: "friends",
    label: "Bạn bè",
    color: "bg-blue-50 text-[#00568c] border border-blue-100",
    dotColor: "bg-[#00568c]",
  },
  {
    value: "family",
    label: "Gia đình",
    color: "bg-green-100 text-green-600 border border-green-200",
    dotColor: "bg-green-500",
  },
  {
    value: "work",
    label: "Công việc",
    color: "bg-orange-100 text-orange-600 border border-orange-200",
    dotColor: "bg-orange-500",
  },
  {
    value: "customers",
    label: "Khách hàng",
    color: "bg-purple-100 text-purple-600 border border-purple-200",
    dotColor: "bg-purple-500",
  },
];

export default function ChannelList({ width }: ChannelListProps) {
  const user = useRecoilValue(userAtom);
  const [search, setSearch] = useState("");
  const [results, setResults] = useRecoilState(conversationListAtom);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState("favorites");
  const [selectedChat, setSelectedChat] = useRecoilState(selectedChatState);
  const [isGroupModalOpen, setIsGroupModalOpen] =
    useRecoilState(groupModalAtom);
  const [folderTypes, setFolderTypes] = useState<string[]>([]);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useRecoilState(sidebarCollapsedAtom);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeClassifications, setActiveClassifications] = useState<string[]>([]);

  // Refs
  const listContainerRef = useRef<HTMLDivElement>(null);
  const folderDropdownRef = useRef<HTMLDivElement>(null);

  // Classification Feature State
  const [conversationTags, setConversationTags] = useState<
    Record<string, string[]>
  >({});
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    data: Conversation; // Using Conversation type from props
    isGroup: boolean;
  } | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const isLoadingRef = useRef(false);
  const prevFilterRef = useRef<{ filter: string; classifications: string[] }>({
    filter: activeFilter,
    classifications: activeClassifications,
  });

  // Cache for "All" (favorites tab with no classifications)
  const allTabCache = useRef<{
    results: Conversation[];
    page: number;
    hasMore: boolean;
    scrollTop: number;
  } | null>(null);

  // Cache for "Groups" tab
  const groupsTabCache = useRef<{
    results: Conversation[];
    page: number;
    hasMore: boolean;
    scrollTop: number;
  } | null>(null);

  // Handle click outside folder dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        folderDropdownRef.current &&
        !folderDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFolderOpen(false);
      }
    };

    if (isFolderOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFolderOpen]);

  // Load tags from API on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await conversationApi.getTags();
        if (res.data && res.data.data) {
          setConversationTags(res.data.data as Record<string, string[]>);
        }
      } catch (e) {
        console.error("Failed to load conversation tags", e);
      }
    };
    fetchTags();
  }, []);

  // Persist active classifications to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("activeClassifications");
    if (saved) {
      try {
        setActiveClassifications(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse activeClassifications", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("activeClassifications", JSON.stringify(activeClassifications));
  }, [activeClassifications]);

  // Handler for opening context menu
  const handleContextMenu = (
    e: React.MouseEvent,
    item: Conversation,
    isGroup: boolean
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      data: item,
      isGroup,
    });
  };

  // Handler for toggling a tag (Single Tag Mode)
  const toggleTag = async (conversationId: string, tagValue: string) => {
    // Optimistic update
    const currentTags = conversationTags[conversationId] || [];
    let newTags: string[] = [];

    // Logic: Nếu đã có tag này -> xóa (toggle off)
    // Nếu chưa có -> thay thế bằng tag mới (chỉ giữ 1 tag)
    if (currentTags.includes(tagValue)) {
      newTags = [];
    } else {
      newTags = [tagValue];
    }

    // Update local state immediately
    setConversationTags((prev) => ({ ...prev, [conversationId]: newTags }));

    setContextMenu(null);

    // Prepare API call
    const isGroup = conversationId.startsWith("group_");
    const realId = conversationId.replace(isGroup ? "group_" : "user_", "");

    try {
      await conversationApi.updateTags(realId, isGroup, newTags);
    } catch (e) {
      console.error("Failed to update tags API", e);
    }
  };

  // Close context menu on click outside (already handled by container click, but good to have explicit logic if needed)
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Load dữ liệu ban đầu
  useEffect(() => {
    const isAllTab = activeFilter === "favorites" && activeClassifications.length === 0;
    const isGroupsTab = activeFilter === "groups" && activeClassifications.length === 0;
    const wasAllTab = prevFilterRef.current.filter === "favorites" && prevFilterRef.current.classifications.length === 0;
    const wasGroupsTab = prevFilterRef.current.filter === "groups" && prevFilterRef.current.classifications.length === 0;

    // Save current state to cache before switching from All tab
    if (wasAllTab) {
      allTabCache.current = {
        results: results,
        page: page,
        hasMore: hasMore,
        scrollTop: listContainerRef.current?.scrollTop || 0,
      };
    }

    // Save current state to cache before switching from Groups tab
    if (wasGroupsTab) {
      groupsTabCache.current = {
        results: results,
        page: page,
        hasMore: hasMore,
        scrollTop: listContainerRef.current?.scrollTop || 0,
      };
    }

    // Update prev filter
    prevFilterRef.current = { filter: activeFilter, classifications: activeClassifications };

    // Restore from cache if switching to All tab AND cache has data
    if (isAllTab && allTabCache.current && allTabCache.current.results.length > 0) {
      setResults(allTabCache.current.results);
      setPage(allTabCache.current.page);
      setHasMore(allTabCache.current.hasMore);
      setTimeout(() => {
        if (listContainerRef.current && allTabCache.current) {
          listContainerRef.current.scrollTop = allTabCache.current.scrollTop;
        }
      }, 0);
      return;
    }

    // Restore from cache if switching to Groups tab AND cache has data
    if (isGroupsTab && groupsTabCache.current && groupsTabCache.current.results.length > 0) {
      setResults(groupsTabCache.current.results);
      setPage(groupsTabCache.current.page);
      setHasMore(groupsTabCache.current.hasMore);
      setTimeout(() => {
        if (listContainerRef.current && groupsTabCache.current) {
          listContainerRef.current.scrollTop = groupsTabCache.current.scrollTop;
        }
      }, 0);
      return;
    }

    (async () => {
      setLoading(true);
      // Scroll to top when filter changes
      if (listContainerRef.current) {
        listContainerRef.current.scrollTop = 0;
      }
      try {
        const limit = activeClassifications.length > 0 || activeFilter === "groups" ? 1000 : 10;
        const convType = activeFilter === "groups" ? "group" : "";
        const res = await conversationApi.getConversation(1, limit, "", activeClassifications, convType);
        const data = res.data.data;
        const uniqueData: Conversation[] = [];
        const seenIds = new Set<string>();

        data.forEach((item: Conversation) => {
          const isGroup = item.group_id && item.group_id !== "000000000000000000000000";
          const id = isGroup ? `group_${item.group_id}` : `user_${item.user_id}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            uniqueData.push(item);
          }
        });

        setResults(uniqueData);
        setPage(1);
        setHasMore(data.length === limit);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [setResults, activeClassifications, activeFilter]);

  // Socket listener
  useEffect(() => {
    if (!user?.data.id) return;

    socketManager.connect(user.data.id);

    const listener = async (data: ConversationSocketData) => {
      // Xử lý tin nhắn mới
      if (data.type === "conversations" && data.message) {
        const msg = data.message;
        if (msg.parent_id) return;
        console.log("conversations",msg)
        const isOwnMessage = msg.sender_id === user.data.id;
        const isGroup = msg.group_id && msg.group_id !== "000000000000000000000000";

        if (isGroup && msg.sender_id !== user.data.id) {
          try {
            const res = await userApi.getSetting(msg.group_id, true);
            if (res.data && !res.data.is_muted) ding.play();
          } catch (err) {
            console.error("Error fetching group setting for notification:", err);
            ding.play();
          }
        }

        const updateDataInList = (currentResults: Conversation[]) => {
          const existIndex = currentResults.findIndex((c) => {
            if (isGroup) {
              return c.group_id === msg.group_id;
            }
            return (
              c.user_id === msg.user_id &&
              (!c.group_id ||
                c.group_id === "" ||
                c.group_id === "000000000000000000000000")
            );
          });

          const oldConversation = existIndex >= 0 ? currentResults[existIndex] : null;
          const groupDisplayName = oldConversation?.display_name || msg.display_name || "Nhóm mới";

          const newConversation: Conversation = {
            user_id: isGroup ? "" : msg.user_id ?? "",
            group_id: isGroup ? msg.group_id ?? "" : "",
            display_name: isGroup
              ? groupDisplayName
              : isOwnMessage
                ? oldConversation?.display_name || "Người dùng"
                : msg.display_name || oldConversation?.display_name || "Người dùng",
            avatar: isOwnMessage
              ? oldConversation?.avatar ||
                (isGroup ? "/assets/group.png" : "/assets/default-avatar.png")
              : msg.avatar ||
                oldConversation?.avatar ||
                (isGroup ? "/assets/group.png" : "/assets/default-avatar.png"),
            last_message: msg.last_message || oldConversation?.last_message || "",
            last_message_type: msg.last_message_type || oldConversation?.last_message_type || "text",
            last_message_id: msg.last_message_id,
            last_date: new Date().toISOString(),
            unread_count:
              msg.sender_id !== user.data.id &&
              msg.last_message_type !== "system" &&
              msg.last_message_id !== oldConversation?.last_message_id
                ? (oldConversation?.unread_count || 0) + 1
                : oldConversation?.unread_count || 0,
            status: isGroup ? "group" : oldConversation?.status || "offline",
            updated_at: new Date().toISOString(),
            conversation_id: msg.conversation_id || oldConversation?.conversation_id || "",
          };

          const newList = [...currentResults];
          if (existIndex >= 0) {
            newList.splice(existIndex, 1);
          }
          newList.unshift(newConversation);
          return newList;
        };

        // Update current results
        setResults((prev) => updateDataInList(prev));

        // Update cache if it exists
        if (allTabCache.current) {
          allTabCache.current.results = updateDataInList(allTabCache.current.results);
        }
      }

      if (data.type === "recall-message" && data.message) {
        const recalledMsg = data.message;
        const updateRecall = (prev: Conversation[]) =>
          prev.map((conv) => {
            const isGroup = conv.group_id && conv.group_id !== "000000000000000000000000";
            const match =
              (isGroup && conv.group_id === recalledMsg.group_id) ||
              (!isGroup && (conv.user_id === recalledMsg.receiver_id || conv.user_id === recalledMsg.sender_id));

            if (!match || recalledMsg.id !== conv.last_message_id) return conv;

            return {
              ...conv,
              last_message: "",
              last_message_type: "text",
              recalled_at: recalledMsg.recalled_at,
              recalled_by: recalledMsg.recalled_by,
              updated_at: new Date().toISOString(),
            };
          });

        setResults((prev) => updateRecall(prev));
        if (allTabCache.current) {
          allTabCache.current.results = updateRecall(allTabCache.current.results);
        }
      }

      if (data.type === "edit_message_update") {
        const payload = (data as any).payload as { id: string; content: string; edited_at: string };
        if (payload && payload.id) {
          const updateEdit = (prev: Conversation[]) =>
            prev.map((conv) => {
              if (conv.last_message_id === payload.id) {
                return {
                  ...conv,
                  last_message: payload.content,
                  updated_at: new Date().toISOString(),
                };
              }
              return conv;
            });

          setResults((prev) => updateEdit(prev));
          if (allTabCache.current) {
            allTabCache.current.results = updateEdit(allTabCache.current.results);
          }
        }
      }
      console.log("data", data.type);
      if ((data.type === "group_member_added" || data.type === "group_member_removed" || data.type === "member_left") && data.message) {
        const msg = data.message;

        if (data.type === "group_member_added") {
           const updateAdded = (prev: Conversation[]) => {
             const existIndex = prev.findIndex((c) => c.group_id === msg.id); // Assuming msg.id is group_id
             return prev; 
           };
        }

        // Handle cases where the current user leaves or is removed from a group
        if (data.type === "group_member_removed" || data.type === "member_left") {          
          if (msg.user_id === user.data.id) {
            const leftGroupId = msg.group_id;
            console.log("leftGroupId", leftGroupId);
            console.log("msg", msg);
            
            if (leftGroupId) {
              // Remove group from the list
              setResults((prev) => prev.filter((c) => c.group_id !== leftGroupId));

              // If the group is currently open, close it
              if (selectedChat?.group_id === leftGroupId) {
                setSelectedChat(null);
              }
            }
          }
        }
      }

      if (data.type === "group_dissolved") {
        const payload = (data as any).payload;
        console.log("group_dissolved", payload);
        
        if (payload) {
          const dissolvedGroupId = payload.group_id;
          
          const removeGroup = (prev: Conversation[]) => prev.filter((c) => c.group_id !== dissolvedGroupId);

          // 1. Remove group from the list
          setResults((prev) => removeGroup(prev));

          // 2. Update caches
          if (allTabCache.current) {
            allTabCache.current.results = removeGroup(allTabCache.current.results);
          }
          if (groupsTabCache.current) {
            groupsTabCache.current.results = removeGroup(groupsTabCache.current.results);
          }

          // 3. If the group is currently open, close it
          if (selectedChat?.group_id === dissolvedGroupId) {
            setSelectedChat(null);
            window.location.href = "/";
          }
        }
      }

      // Online status
      if (data.user_id && data.status) {
        const updateStatus = (prev: Conversation[]) =>
          prev.map((conv) =>
            conv.user_id === data.user_id ? { ...conv, status: data.status ?? conv.status } : conv
          );
        setResults((prev) => updateStatus(prev));
        if (allTabCache.current) {
          allTabCache.current.results = updateStatus(allTabCache.current.results);
        }
      }
    };

    socketManager.addListener(listener);
    return () => socketManager.removeListener(listener);
  }, [user, setResults, setSelectedChat, selectedChat]);

   const performSearch = async (query: string, tags: string[] = activeClassifications) => {
    setLoading(true);
    setPage(1);
    setHasMore(true);

    if (observer.current) {
      observer.current.disconnect();
    }

    try {
      const limit = tags.length > 0 || activeFilter === "groups" ? 1000 : 10;
      const convType = activeFilter === "groups" ? "group" : "";
      const res = await conversationApi.getConversation(1, limit, query, tags, convType);
      const data = res.data.data;
      const uniqueData: Conversation[] = [];
      const seenIds = new Set<string>();

      data.forEach((item: Conversation) => {
        const isGroup =
          item.group_id && item.group_id !== "000000000000000000000000";
        const id = isGroup ? `group_${item.group_id}` : `user_${item.user_id}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          uniqueData.push(item);
        }
      });

      setResults(uniqueData);
      setHasMore(data.length === limit);
    } catch {
      setResults([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key !== "Enter") return;
    const trimmedSearch = search.trim();
    setHasSearched(true);
    await performSearch(trimmedSearch); 
  };

  const handleClearSearch = async () => {
    setSearch("");
    setHasSearched(false);
    await performSearch("");
  };
  const toggleFolder = (value: string) => {
    setActiveClassifications((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const truncateText = (text: string, max = 40) => {
    if (!text) return "";
    return text.length > max ? text.slice(0, max) + "..." : text;
  };

  const handleSelectConversation = (item: Conversation, isGroup: boolean) => {

    if (isFolderOpen || contextMenu) {
      return;
    }

    if (item.sender_id != user?.data.id) {
      socketManager.sendSeenMessage(
        item.last_message_id,
        isGroup ? item.group_id : item.user_id,
        user?.data.id
      );
    }

    // Explicitly select fields to avoid carrying non-serializable or unnecessary data
    const finalGroupId = isGroup ? item.group_id || "" : "";
    const finalUserId = isGroup ? "" : item.user_id || "";

    setSelectedChat({
      user_id: finalUserId,
      group_id: finalGroupId,
      avatar: item.avatar || "",
      display_name: item.display_name || "Unknown",
      status: item.status || "offline",
      update_at: item.updated_at || new Date().toISOString(),
      conversation_id: item.conversation_id || "",
      is_deleted: !!item.is_deleted || item.status === "deleted",
    });
  };

  // Load more function
const loadMore = useCallback(async () => {
  if (!hasMore || isLoadingRef.current) return;

  isLoadingRef.current = true;
  setLoadingMore(true);
  const nextPage = page + 1;

  try {
    const limit = activeClassifications.length > 0 || activeFilter === "groups" ? 1000 : 10;
    const convType = activeFilter === "groups" ? "group" : "";
    const res = await conversationApi.getConversation(nextPage, limit, search, activeClassifications, convType);
    const newData = res.data.data;

    // Lọc bỏ duplicate trước khi thêm vào cache
    setResults((prev) => {
      const existingIds = new Set(
        prev.map(item => {
          const isGroup = item.group_id && item.group_id !== "000000000000000000000000";
          return isGroup ? `group_${item.group_id}` : `user_${item.user_id}`;
        })
      );

      const uniqueNewData = newData.filter(item => {
        const isGroup = item.group_id && item.group_id !== "000000000000000000000000";
        const id = isGroup ? `group_${item.group_id}` : `user_${item.user_id}`;
        return !existingIds.has(id);
      });

      const nextResults = [...prev, ...uniqueNewData];

      // Update cache if on "All" tab
      if (activeFilter === "favorites" && activeClassifications.length === 0) {
        allTabCache.current = {
          results: nextResults,
          page: nextPage,
          hasMore: newData.length === 10,
          scrollTop: listContainerRef.current?.scrollTop || 0,
        };
      }

      // Update cache if on "Groups" tab
      if (activeFilter === "groups" && activeClassifications.length === 0) {
        groupsTabCache.current = {
          results: nextResults,
          page: nextPage,
          hasMore: newData.length === 1000,
          scrollTop: listContainerRef.current?.scrollTop || 0,
        };
      }

      return nextResults;
    });

    setPage(nextPage);
    setHasMore(newData.length === limit);
  } catch (e) {
    console.error("Load more error:", e);
    setHasMore(false);
  } finally {
    setLoadingMore(false);
    isLoadingRef.current = false;
  }
}, [page, search, hasMore, setResults, activeFilter, activeClassifications]);

  // Callback ref cho lazy loading
 const lastConversationRef = useCallback(
  (node: HTMLDivElement | null) => {  // ✅ Đổi từ HTMLButtonElement -> HTMLDivElement
    if (observer.current) {
      observer.current.disconnect();
    }

    if (loadingMore || !hasMore || loading || !node) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingRef.current) {
          console.log("🔥 Trigger loadMore"); // Debug log
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    observer.current.observe(node);
  },
  [loadingMore, hasMore, loading, loadMore]
);

  // Cleanup observer khi unmount
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]+>/g, "").trim();
  };

  const formatMessagePreview = (item: Conversation, userId: string): string => {
    // Nếu tin nhắn bị thu hồi
    if (item.recalled_at) {
      return item.recalled_by === userId
        ? "Bạn đã thu hồi tin nhắn"
        : "Tin nhắn đã bị thu hồi";
    }

    // Nếu không có tin nhắn
    if (!item.last_message || item.last_message.trim() === "") {
      return "Chưa có tin nhắn";
    }

    // Prefix "Bạn:" nếu là người gửi
    const prefix = item.sender_id === userId ? "Bạn: " : "";
    // Xử lý theo loại tin nhắn
    switch (item.last_message_type) {
      case "image":
        return `${prefix}[Hình ảnh]`;

      case "video":
        return `${prefix}[Video]`;

      case "file":
        return `${prefix} Đã gửi 1 file dữ liệu`;

      case "audio":
        return `${prefix}[Tin nhắn âm thanh]`;

      case "sticker":
        return `${prefix}[Sticker]`;

      case "location":
        return `${prefix}[Vị trí]`;

      case "contact":
        return `${prefix}[Liên hệ]`;

      default:
        // Text message
        return `${prefix}${truncateText(stripHtml(item.last_message), 40)}`;
    }
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white relative">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-100">
            {sidebarCollapsed && window.innerWidth >= 768 && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                title="Mở sidebar"
                className="!flex !items-center !justify-center !w-8 !h-8 !rounded-full !text-[#00568c] hover:!bg-blue-50 !transition-colors !cursor-pointer flex-shrink-0"
              >
                <PanelLeftOpen size={18} />
              </button>
            )}
            {width > 280 ? (
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Tìm kiếm"
                  className={`
                    !w-full !h-8 !pl-9 !pr-9 !text-[13px] !rounded-full focus:!outline-none focus:!ring-2 focus:!ring-[#00568c]/20 !transition-all !border-none
                    !bg-gray-100 !text-gray-900 !placeholder-gray-400 focus:!bg-white focus:!ring-[#00568c]
                  `}
                />
                {search && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00568c] transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex justify-start">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {/* Focus search or open mini search */}}
                  className={`!flex !items-center !justify-center !w-8 !h-8 !rounded-full !transition-colors !cursor-pointer !text-[#00568c] hover:!bg-blue-50`}
                  title="Tìm kiếm"
                >
                  <Search size={18} />
                </motion.button>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsGroupModalOpen(true)}
              className={`
                !flex !items-center !justify-center !w-8 !h-8 !rounded-full !transition-colors !cursor-pointer !text-[#00568c] hover:!bg-blue-50
              `}
              title="Tạo nhóm"
            >
              <UserPlus size={18} />
            </motion.button>
          </div>

          {/* Filter Tabs - Zalo Style (Underline) */}
          <div className="flex items-center px-2 mt-0 border-t border-gray-100">
            {["favorites", "groups", "recent"].map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setActiveFilter(filter);
                  setActiveClassifications([]); // Clear classifications when switching to All/Unread/Groups
                }}
                className={`!relative !px-2 !py-1.5 !text-xs !font-bold !transition-colors !cursor-pointer !flex-shrink-0 !whitespace-nowrap ${
                  activeFilter === filter && activeClassifications.length === 0
                    ? "!text-[#00568c]"
                    : "!text-gray-400 hover:!text-[#00568c]"
                }`}
              >
                {width > 280 ? (
                  filter === "favorites" ? "Tất cả" : filter === "groups" ? "Nhóm" : "Chưa đọc"
                ) : (
                  filter === "favorites" ? <MessageSquareText size={18} /> : filter === "groups" ? <Users size={18} /> : <Bell size={18} />
                )}

                {/* Active Indicator Underline */}
                {activeFilter === filter && activeClassifications.length === 0 && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="!absolute !bottom-0 !left-0 !right-0 !h-[2px] !bg-[#00568c] !rounded-t-full"
                  />
                )}
              </button>
            ))}

            {/* Phân loại (Dropdown) */}
            <div className="relative ml-auto flex-shrink-0" ref={folderDropdownRef}>
              <button
                onClick={(e) => {
           
                  e.stopPropagation();
                  setIsFolderOpen((prev) => !prev);
                }}
                className={`!flex !items-center !gap-1 !py-1.5 !px-2 !text-xs !font-bold !transition-colors !cursor-pointer !relative ${
                  activeClassifications.length > 0
                    ? "!text-[#00568c]"
                    : "!text-gray-400 hover:!text-[#00568c]"
                }`}
              >
                {width > 180 ? (
                  activeClassifications.length > 0 ? 
                    `Phân loại (${activeClassifications.length})` 
                    : "Phân loại"
                ) : null}
                <ChevronDown size={14} />
                
                {/* Active Indicator Underline for 'Folders' */}
                {activeClassifications.length > 0 && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="!absolute !bottom-0 !left-0 !right-0 !h-[2px] !bg-[#00568c] !rounded-t-full"
                  />
                )}
              </button>

              {/* Dropdown */}
              {isFolderOpen && (
                <div className="!absolute !right-0 !top-full !mt-1 !w-44 !bg-white !rounded-lg !shadow-xl !border !border-gray-100 !py-1 !z-[99999] !overflow-hidden">
                  {[
                    { value: "friends", label: "Bạn bè" },
                    { value: "family", label: "Gia đình" },
                    { value: "work", label: "Công việc" },
                    { value: "customers", label: "Khách hàng" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFolder(item.value);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div
                        className={`!w-4 !h-4 !rounded !border !flex !items-center !justify-center !transition-colors ${
                          activeClassifications.includes(item.value)
                            ? "!bg-[#00568c] !border-[#00568c]"
                            : "!border-gray-300"
                        }`}
                      >
                        {activeClassifications.includes(item.value) && (
                          <span className="text-white text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        <div className={`flex-1 pl-0 pt-0 overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent ${
          isFolderOpen ? '!pointer-events-none' : ''
        }`}>
          <div
            ref={listContainerRef}
            className="flex-1 pl-0 pt-0 overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent h-full relative"
            onClick={() => setContextMenu(null)}
            onScroll={() => setContextMenu(null)}
          >
            {(() => {
              const seenIds = new Set<string>();
              const filteredResults = results.filter((item) => {
                const isGroup =
                  item.group_id && item.group_id !== "000000000000000000000000";
                const id = isGroup ? `group_${item.group_id}` : `user_${item.user_id}`;
                
                if (seenIds.has(id)) return false;
                seenIds.add(id);

                // Loại bỏ conversation của chính user (không phải nhóm)
                if (!isGroup && item.user_id === user?.data?.id) {
                  return false;
                }

                if (activeFilter === "recent") {
                  return item.unread_count > 0;
                }
                if (activeClassifications.length > 0) {
                  const tags = conversationTags[id] || [];
                  return activeClassifications.some(c => tags.includes(c));
                }
                return true;
              });

              if (loading) {
                return <ChatSkeletonList count={8} />;
              }

              if (hasSearched && results.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <Search
                      size={48}
                      strokeWidth={1}
                      className="mb-2 opacity-50"
                    />
                    <p className="text-sm">Không tìm thấy cuộc trò chuyện</p>
                  </div>
                );
              }

              if (filteredResults.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center px-4">
                    {activeFilter === "recent" ? (
                      <>
                        <MessageSquareText
                          size={48}
                          strokeWidth={1}
                          className="mb-2 opacity-50"
                        />
                        <p className="text-sm">Không có tin nhắn chưa đọc</p>
                      </>
                    ) : activeFilter === "folders" && folderTypes.length > 0 ? (
                      <>
                        <Users
                          size={48}
                          strokeWidth={1}
                          className="mb-2 opacity-50"
                        />
                        <p className="text-sm">
                          Không có cuộc trò chuyện nào trong phân loại này
                        </p>
                      </>
                    ) : (
                      <>
                        <MessageSquareText
                          size={48}
                          strokeWidth={1}
                          className="mb-2 opacity-50"
                        />
                        <p className="text-sm">Chưa có cuộc trò chuyện nào</p>
                      </>
                    )}
                  </div>
                );
              }

              return (
                <>
                  {filteredResults.map((item) => {
                    const isGroup = Boolean(
                      item.group_id &&
                        item.group_id !== "000000000000000000000000"
                    );
                    const isSelected =
                      selectedChat?.group_id === item.group_id &&
                      selectedChat?.user_id === item.user_id;
                    const hasUnread = item.unread_count > 0;
                    const isOnline = item.status?.toLowerCase() === "online";

                    const convId = isGroup
                      ? `group_${item.group_id}`
                      : `user_${item.user_id}`;
                    const tags = conversationTags[convId] || [];

                    return (
                      <button
                        key={convId}
                        onClick={() =>
                          handleSelectConversation(item, Boolean(isGroup))
                        }
                        onContextMenu={(e) =>
                          handleContextMenu(e, item, isGroup)
                        }
                        className={`!flex !items-center !w-full !text-left !transition-colors !cursor-pointer !border-b !border-transparent !select-none
                        ${width <= 120 ? '!justify-center !px-1.5 !py-2' : '!px-2.5 !py-2 !gap-2.5'}
                        ${
                          isSelected
                            ? "!bg-[#E0F2FE]"
                            : "!bg-white hover:!bg-gray-50"
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <UserAvatar
                            avatar={item.avatar}
                            isOnline={!isGroup && isOnline}
                            display_name={item.display_name}
                            isGroup={isGroup}
                            size={40} // Default was 48, shrink to 40
                            showOnlineStatus={!isGroup && width > 120}
                          />
                          {width <= 120 && hasUnread && (
                             <span className="absolute -top-1 -right-1 !bg-[#00568c] !text-white !text-[9px] !font-bold !min-w-[16px] !h-[16px] !flex !items-center !justify-center !rounded-full !shadow-sm !border-2 !border-white !z-10 !leading-none">
                              {item.unread_count > 99 ? '99+' : item.unread_count}
                            </span>
                          )}
                        </div>

                        {width > 120 && (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-2 overflow-hidden flex-1">
                                <p
                                  className={`text-[14px] font-semibold truncate transition-colors ${
                                    isSelected 
                                      ? "!text-[#00568c]" 
                                      : hasUnread 
                                        ? "!text-gray-900 !font-bold" 
                                        : "!text-gray-900"
                                  }`}
                                >
                                  {item.display_name}
                                </p>
                              </div>
        
                              {width > 200 && item.last_date &&
                                new Date(item.last_date).getFullYear() >
                                  2000 && (
                                  <span className={`text-[10px] flex-shrink-0 ml-1 ${isSelected ? "text-[#00568c] opacity-70" : "text-gray-400"}`}>
                                    {timeAgo.format(new Date(item.last_date))}
                                  </span>
                                )}
                              
                              {width <= 200 && hasUnread && !isSelected && (
                                <span className="!bg-[#00568c] !text-white !text-[10px] !font-semibold !px-1.5 !py-0.5 !rounded-full !shadow !flex-shrink-0">
                                  {item.unread_count}
                                </span>
                              )}
                            </div>

                            {width > 200 && (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <p
                                    className={`text-[12px] truncate transition-colors ${
                                      isSelected
                                        ? "text-[#00568c] opacity-90"
                                        : hasUnread
                                        ? "font-medium text-[#00568c]"
                                        : item.recalled_at
                                        ? "text-gray-400 italic"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {formatMessagePreview(
                                      item,
                                      user?.data.id || ""
                                    )}
                                  </p>
                                  {/* Display Single Tag below message */}
                                  {tags.length > 0 &&
                                    (() => {
                                      const tag = tags[0]; // Take only the first tag
                                      const tagInfo = TAG_TYPES.find(
                                        (t) => t.value === tag
                                      );
                                      if (!tagInfo) return null;
                                      return (
                                        <div className="mt-1">
                                          <span
                                            className={`!inline-block !text-[10px] !px-1.5 !py-0.5 !rounded !font-medium !leading-none ${tagInfo.color}`}
                                            title={tagInfo.label}
                                          >
                                            {tagInfo.label}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                </div>

                                {hasUnread && !isSelected && (
                                  <span className="!bg-[#00568c] !text-white !text-[10px] !font-semibold !px-1.5 !py-0.5 !rounded-full !shadow !flex-shrink-0">
                                    {item.unread_count}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}

                   {hasMore && !loadingMore && !loading && (
                    <div 
                      ref={lastConversationRef as any}
                      className="h-1 w-full"
                      style={{ minHeight: '1px' }}
                    />
                  )}

                  {/* Loading indicator */}
                  {loadingMore && (
                    <div className="text-center py-4">
                      <div className="inline-block w-5 h-5 border-2 border-[#2162ff] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[#9ba3b7] text-xs mt-2">
                        Đang tải thêm...
                      </p>
                    </div>
                  )}

                  {/* End message */}
                  {!hasMore && filteredResults.length > 0 && !loading && (
                    <div className="text-center py-3">
                      <p className="text-[#9ba3b7] text-xs">
                        Đã hiển thị tất cả
                      </p>
                    </div>
                  )}
                </>
              );
            })()}

          </div>
        </div>
      </div>

      {isFolderOpen && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsFolderOpen(false);
          }}
          className="!fixed !inset-0 !bg-transparent !z-[99998] !cursor-default"
        />
      )}

      {contextMenu && (
        <>
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              setContextMenu(null);
            }}
            className="!fixed !inset-0 !bg-transparent !z-[99998] !cursor-default"
          />
          <div
            className="!fixed !bg-white !rounded-lg !shadow-xl !border !border-gray-100 !py-2 !z-[99999] !w-48 !animate-in !fade-in !zoom-in-95 !duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 tracking-wider mb-1 border-b border-gray-100">
              Phân loại 
            </div>
            {TAG_TYPES.map((type) => {
              const id = contextMenu.isGroup
                ? `group_${contextMenu.data.group_id}`
                : `user_${contextMenu.data.user_id}`;
              const isActive = (conversationTags[id] || []).includes(
                type.value
              );

              return (
                <button
                  key={type.value}
                  onClick={() => toggleTag(id, type.value)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`!w-3 !h-3 !rounded-full ${type.dotColor}`}
                    />
                    <span>{type.label}</span>
                  </div>
                  {isActive && (
                    <div className="!w-1.5 !h-1.5 !rounded-full !bg-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </>
  );
}
