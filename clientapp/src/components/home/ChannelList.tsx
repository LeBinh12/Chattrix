import { ChevronDown, Search, Users } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { conversationApi } from "../../api/conversation";
import { TING } from "../../assets/paths";
import type { Conversation } from "../../types/conversation";
import { useRecoilState, useRecoilValue } from "recoil";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import UserAvatar from "../UserAvatar";
import { userAtom } from "../../recoil/atoms/userAtom";
import { socketManager } from "../../api/socket";
import { Howl } from "howler";
import { userApi } from "../../api/userApi";
import { groupModalAtom } from "../../recoil/atoms/uiAtom";
import TimeAgo from "javascript-time-ago";
import vi from "javascript-time-ago/locale/vi.json";
import CreateGroupModal from "../group/CreateGroup";
import ChatSkeletonList from "../../skeleton/ChatSkeletonList";
import { conversationListAtom } from "../../recoil/atoms/conversationListAtom";

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
  };
  user_id?: string;
  status?: Conversation["status"];
};

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
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);
  const isLoadingRef = useRef(false);

  // Load dữ liệu ban đầu
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await conversationApi.getConversation(1, 20, "");
        setResults(res.data.data);
        setPage(1);
        setHasMore(res.data.data.length === 20);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [setResults]);

  // Socket listener
  useEffect(() => {
    if (!user?.data.id) return;

    socketManager.connect(user.data.id);

    const listener = async (data: ConversationSocketData) => {
      // Xử lý tin nhắn mới
      if (data.type === "conversations" && data.message) {
        const msg = data.message;
        const isOwnMessage = msg.sender_id === user.data.id;
        const isGroup =
          msg.group_id && msg.group_id !== "000000000000000000000000";

        if (isGroup && msg.sender_id !== user.data.id) {
          const res = await userApi.getSetting(msg.group_id, true);
          if (!res.data.is_muted) ding.play();
        }

        if (msg.sender_id === user.data.id) {
          msg.updated_at = new Date().toISOString();
          msg.last_date = msg.updated_at;
        }

        setResults((prev) => {
          const existIndex = prev.findIndex((c) => {
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

          const oldConversation = existIndex >= 0 ? prev[existIndex] : null;
          const updatedConversation: Conversation = {
            user_id: isGroup ? "" : msg.user_id ?? "",
            sender_id: msg.sender_id ?? "",
            group_id: isGroup ? msg.group_id ?? "" : "",
            display_name: isOwnMessage
              ? oldConversation?.display_name ||
                (isGroup ? "Nhóm" : "Người dùng")
              : msg.display_name ||
                oldConversation?.display_name ||
                (isGroup ? "Nhóm" : "Người dùng"),

            avatar: isOwnMessage
              ? oldConversation?.avatar ||
                (isGroup ? "/assets/group.png" : "/assets/default-avatar.png")
              : msg.avatar ||
                oldConversation?.avatar ||
                (isGroup ? "/assets/group.png" : "/assets/default-avatar.png"),
            last_message:
              msg.last_message || oldConversation?.last_message || "",
            last_message_type:
              msg.last_message_type ||
              oldConversation?.last_message_type ||
              "text",
            last_message_id: msg.last_message_id,
            last_date: new Date().toISOString(),
            unread_count:
              msg.sender_id !== user.data.id
                ? (oldConversation?.unread_count || 0) + 1
                : oldConversation?.unread_count || 0,
            status: isGroup ? "group" : oldConversation?.status || "offline",
            updated_at: new Date().toISOString(),
          };

          if (existIndex >= 0) {
            const newList = [...prev];
            newList.splice(existIndex, 1);
            return [updatedConversation, ...newList];
          }

          return [updatedConversation, ...prev];
        });
      }

      if (data.type === "recall-message" && data.message) {
        const recalledMsg = data.message;
        console.log("recalledMsg", recalledMsg);
        setResults((prev) =>
          prev.map((conv) => {
            const isGroup =
              conv.group_id && conv.group_id !== "000000000000000000000000";

            // Conversation khớp?
            const match =
              (isGroup && conv.group_id === recalledMsg.group_id) ||
              (!isGroup &&
                (conv.user_id === recalledMsg.receiver_id ||
                  conv.user_id === recalledMsg.sender_id));

            if (!match) return conv;

            // ❗ Chỉ update nếu tin bị recall chính là last_message
            if (recalledMsg.id !== conv.last_message_id) {
              return conv; // Không thay đổi gì
            }

            return {
              ...conv,
              last_message: "", // hoặc "Tin nhắn đã bị thu hồi"
              last_message_type: "text",
              recalled_at: recalledMsg.recalled_at,
              recalled_by: recalledMsg.recalled_by,
              updated_at: new Date().toISOString(),
              unread_count: conv.unread_count, // Không tăng unread
            };
          })
        );
      }

      if (data.type === "group_member_added" && data.message) {
        const msg = data.message;
        console.log("msggroup_member_added", msg);
        setResults((prev) => {
          // Check xem group đã có trong danh sách chưa
          const existIndex = prev.findIndex((c) => c.group_id === msg.group_id);

          const newConversation: Conversation = {
            user_id: "",
            group_id: msg.group_id,
            display_name: msg.display_name ?? "",
            avatar: msg.avatar || "/assets/group.png",
            last_message: msg.last_message ?? "",
            last_message_type: msg.last_message_type || "text",
            last_message_id: msg.last_message_id,
            last_date: msg.last_date || new Date().toISOString(),
            unread_count: 0,
            status: "group",
            updated_at: msg.updated_at || new Date().toISOString(),
          };

          // Nếu đã tồn tại → cập nhật lên đầu
          if (existIndex >= 0) {
            const newList = [...prev];
            newList.splice(existIndex, 1);
            return [newConversation, ...newList];
          }

          // Nếu chưa → thêm mới lên đầu
          return [newConversation, ...prev];
        });
      }

      if (data.type === "member_left" && data.message) {
        const msg = data.message;
        if (msg.sender_id !== user.data.id) return;

        const leftGroupId = msg.group_id;

        if (!leftGroupId) return;

        setResults((prev) => {
          const exist = prev.some((c) => c.group_id === leftGroupId);

          if (!exist) return prev;

          return prev.filter((c) => c.group_id !== leftGroupId);
        });

        setSelectedChat(null)
        return;
      }

      // Xử lý cập nhật status online/offline
      if (data.user_id && data.status) {
        setResults((prev) =>
          prev.map((conv) =>
            conv.user_id === data.user_id
              ? { ...conv, status: data.status ?? conv.status }
              : conv
          )
        );
      }
    };

    socketManager.addListener(listener);
    return () => socketManager.removeListener(listener);
  }, [user, setResults]);

  const handleSearchKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key !== "Enter") return;
    setHasSearched(true);
    setLoading(true);
    setPage(1);
    setHasMore(true);

    try {
      const res = await conversationApi.getConversation(1, 20, search);
      setResults(res.data.data);
      setHasMore(res.data.data.length === 20);
    } catch {
      setResults([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (value: string) => {
    setFolderTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const truncateText = (text: string, max = 40) => {
    if (!text) return "";
    return text.length > max ? text.slice(0, max) + "..." : text;
  };

  const handleSelectConversation = (item: Conversation, isGroup: boolean) => {
    if (item.sender_id != user?.data.id) {
      socketManager.sendSeenMessage(
        item.last_message_id,
        isGroup ? item.group_id : item.user_id,
        user?.data.id
      );
    }
    setSelectedChat({
      user_id: isGroup ? "" : item.user_id,
      group_id: isGroup ? item.group_id : "",
      avatar: item.avatar,
      display_name: item.display_name,
      status: item.status,
      update_at: item.updated_at,
    });
  };

  // Load more function
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingRef.current) return;

    isLoadingRef.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const res = await conversationApi.getConversation(nextPage, 20, search);
      const newData = res.data.data;

      setResults((prev) => [...prev, ...newData]);
      setPage(nextPage);
      setHasMore(newData.length === 20);
    } catch (e) {
      console.error("Load more error:", e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [page, search, hasMore, setResults]);

  // Callback ref cho lazy loading
  const lastConversationRef = useCallback(
    (node: HTMLButtonElement | null) => {
      // Cleanup observer cũ
      if (observer.current) {
        observer.current.disconnect();
      }

      // Không setup observer nếu đang loading hoặc không còn dữ liệu
      if (loadingMore || !hasMore || loading) return;

      // Tạo observer mới
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isLoadingRef.current) {
            loadMore();
          }
        },
        {
          root: null,
          rootMargin: "100px", // Load trước khi scroll đến cuối 100px
          threshold: 0.1,
        }
      );

      // Observe node mới
      if (node) {
        observer.current.observe(node);
      }
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
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 sm:p-5 flex-shrink-0 border-b border-[#e4e8f1] space-y-3 sm:space-y-4">
          {/* Tiêu đề */}
          <div>
            <div className="flex + justify-between + align-center">
            <p className="text-[10px] uppercase tracking-wide text-[#7c8aac] font-semibold">
              Danh sách chat
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[#7c8aac] font-semibold">
              {user?.data.display_name}
              </p>  
              </div>
            <h2 className="text-sm sm:text-base font-semibold text-[#1e2b4a]">
              Tin nhắn
            </h2>
          </div>

          {/* Hàng search + nút nhóm */}
          <div className="flex items-center gap-2">
            {/* Search box rộng */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7c8aac]">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Tìm kiếm người dùng hoặc nhóm..."
                className="w-full h-9 pl-10 pr-3 text-sm border border-[#dce3f1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#2162ff]"
              />
            </div>

            {/* Nút tạo nhóm nhỏ, chỉ icon */}
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="flex items-center justify-center w-9 h-9 
              rounded-xl bg-transparent shadow transition-all cursor-pointer
              hover:bg-gradient-to-r hover:from-[#0172ff] hover:to-[#01c5ff]"
            >
              <Users
                size={16}
                className="text-black transition-colors hover:text-white"
              />
            </button>
          </div>

          {/* Filter buttons */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#6a7798] relative z-20">
            {["favorites", "recent"].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-full transition ${
                  activeFilter === filter
                    ? "bg-[#e4edff] text-[#2162ff]"
                    : "hover:bg-[#f1f4fa]"
                }`}
              >
                {filter === "favorites" && "Tất cả"}
                {filter === "recent" && "Chưa đọc"}
              </button>
            ))}

            {/* Nút phân loại có dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setActiveFilter("folders");
                  setIsFolderOpen((prev) => !prev);
                }}
                className={`px-3 py-1.5 flex items-center gap-1.5 rounded-full transition ${
                  activeFilter === "folders"
                    ? "bg-[#e4edff] text-[#2162ff]"
                    : "hover:bg-[#f1f4fa]"
                }`}
              >
                Phân loại
                <ChevronDown size={14} />
              </button>

              {/* Dropdown chọn phân loại */}
              {isFolderOpen && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-[#e4e8f1] py-2 z-[9999]">
                  {[
                    { value: "friends", label: "Bạn bè" },
                    { value: "family", label: "Gia đình" },
                    { value: "work", label: "Công việc" },
                    { value: "customers", label: "Khách hàng" },
                    { value: "strangers", label: "Người lạ" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => toggleFolder(item.value)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#f5f7fb]"
                    >
                      {/* Checkbox */}
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          folderTypes.includes(item.value)
                            ? "bg-[#2162ff] border-[#2162ff]"
                            : "border-[#bfc9dd]"
                        }`}
                      >
                        {folderTypes.includes(item.value) && (
                          <span className="text-white text-[10px] font-bold">
                            ✔
                          </span>
                        )}
                      </span>

                      <span
                        className={
                          folderTypes.includes(item.value)
                            ? "text-[#2162ff] font-semibold"
                            : ""
                        }
                      >
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 bg-[#f6f7fb] space-y-2 scrollbar-thin scrollbar-thumb-[#d0d7e9] scrollbar-track-transparent">
          {loading ? (
            <ChatSkeletonList count={8} />
          ) : hasSearched && results.length === 0 ? (
            <div className="text-center text-[#9ba3b7] py-12 text-sm">
              Không tìm thấy cuộc trò chuyện nào
            </div>
          ) : (
            <>
              {results.map((item, index) => {
                const isGroup = Boolean(
                  item.group_id && item.group_id !== "000000000000000000000000"
                );
                const isSelected =
                  selectedChat?.group_id === item.group_id &&
                  selectedChat?.user_id === item.user_id;
                const hasUnread = item.unread_count > 0;
                const isOnline = item.status?.toLowerCase() === "online";
                const isLastElement = index === results.length - 1;

                return (
                  <button
                    key={
                      isGroup
                        ? `group_${item.group_id}`
                        : `user_${item.user_id}`
                    }
                    ref={isLastElement ? lastConversationRef : null}
                    onClick={() =>
                      handleSelectConversation(item, Boolean(isGroup))
                    }
                    className={`flex items-center gap-3 w-full text-left px-3.5 py-2.5 rounded-2xl transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-white shadow-lg border-[#bed3ff]"
                        : "bg-white/70 border-transparent hover:border-[#d8def0] hover:bg-white"
                    }`}
                  >
                    <UserAvatar
                      avatar={item.avatar}
                      isOnline={!isGroup && isOnline}
                      display_name={item.display_name}
                      isGroup={isGroup}
                    />

                    {width > 200 && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p
                            className={`text-[13px] font-semibold text-[#1f2a44] truncate ${
                              hasUnread ? "text-[#0d56d4]" : ""
                            }`}
                          >
                            {item.display_name}
                          </p>
                          {item.last_date && (
                            <span className="text-[11px] text-[#95a1ba]">
                              {timeAgo.format(new Date(item.last_date))}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-[12px] truncate ${
                              hasUnread
                                ? "font-semibold text-[#1f2a44]"
                                : item.recalled_at
                                ? "text-[#9ba3b7] italic"
                                : "text-[#6f7a95]"
                            }`}
                          >
                            {formatMessagePreview(item, user?.data.id || "")}
                          </p>

                          {hasUnread && (
                            <span className="bg-[#ff4d6b] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full shadow">
                              {item.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Loading indicator khi đang tải thêm */}
              {loadingMore && (
                <div className="text-center py-4">
                  <div className="inline-block w-5 h-5 border-2 border-[#2162ff] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[#9ba3b7] text-xs mt-2">
                    Đang tải thêm...
                  </p>
                </div>
              )}

              {/* Thông báo khi đã hết dữ liệu */}
              {!hasMore && results.length > 0 && !loading && (
                <div className="text-center py-3">
                  <p className="text-[#9ba3b7] text-xs">Đã hiển thị tất cả</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </>
  );
}
