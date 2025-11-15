import { Search, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { conversationApi } from "../../api/conversation";
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

TimeAgo.addDefaultLocale(vi);
const timeAgo = new TimeAgo("vi-VN");

const ding = new Howl({
  src: ["/assets/ting.mp3"],
  preload: true,
  volume: 0.8,
});

interface ChannelListProps {
  width: number;
}

export default function ChannelList({ width }: ChannelListProps) {
  const user = useRecoilValue(userAtom);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedChat, setSelectedChat] = useRecoilState(selectedChatState);
  const [isGroupModalOpen, setIsGroupModalOpen] =
    useRecoilState(groupModalAtom);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await conversationApi.getConversation(1, 20, "");
        setResults(res.data.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user?.data.id) return;

    socketManager.connect(user.data.id);

    const listener = async (data: any) => {
      if (data.type === "conversations" && data.message) {
        const msg = data.message;
        const isGroup =
          msg.group_id && msg.group_id !== "000000000000000000000000";

        if (isGroup && msg.sender_id !== user.data.id) {
          const res = await userApi.getSetting(msg.group_id, true);
          if (!res.data.is_muted) ding.play();
        }

        setResults((prev) => {
          const existIndex = prev.findIndex((c) => {
            if (isGroup) return c.group_id === msg.group_id;
            return !c.group_id && c.user_id === (isGroup ? "" : msg.user_id);
          });

          const oldConversation = existIndex >= 0 ? prev[existIndex] : null;

          const updatedConversation: Conversation = {
            user_id: isGroup ? "" : msg.user_id,
            group_id: isGroup ? msg.group_id : "",
            display_name:
              msg.display_name ||
              oldConversation?.display_name ||
              (isGroup ? "Nhóm" : "Người dùng"),
            avatar:
              msg.avatar ||
              oldConversation?.avatar ||
              (isGroup ? "/assets/group.png" : "/assets/default-avatar.png"),
            last_message:
              msg.last_message || oldConversation?.last_message || "",
            last_message_type:
              msg.last_message_type ||
              oldConversation?.last_message_type ||
              "text",
            last_date: new Date().toISOString(),
            unread_count:
              msg.sender_id !== user.data.id
                ? (oldConversation?.unread_count || 0) + 1
                : oldConversation?.unread_count || 0,
            status: isGroup ? "group" : oldConversation?.status || "offline",
            updated_at: new Date().toISOString(),
            sender_id: msg.sender_id,
          };

          if (existIndex >= 0) {
            const newList = [...prev];
            newList.splice(existIndex, 1);
            return [updatedConversation, ...newList];
          }

          return [updatedConversation, ...prev];
        });
      }

      if (data.user_id && data.status) {
        setResults((prev) =>
          prev.map((conv) =>
            conv.user_id === data.user_id
              ? { ...conv, status: data.status }
              : conv
          )
        );
      }
    };

    socketManager.addListener(listener);
    return () => socketManager.removeListener(listener);
  }, [user]);

  const handleSearchKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key !== "Enter") return;
    setHasSearched(true);
    setLoading(true);
    try {
      const res = await conversationApi.getConversation(1, 10, search);
      setResults(res.data.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const theme = {
    bg: "bg-[#003ea3]",
    searchBg: "bg-gray-300",
    searchFocus: "focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30",
    searchText: "text-gray-600 placeholder-gray-500",
    searchIcon: "text-gray-600",
    button:
      "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl",
    buttonIcon: "text-white",
    card: "bg-blue-800/40 backdrop-blur-sm border border-blue-700/30",
    cardHover: "hover:bg-blue-700/50 hover:border-blue-600/50 hover:shadow-lg",
    cardActive:
      "bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500/50 shadow-lg ring-2 ring-blue-400/30",
    text: "text-white",
    textSecondary: "text-blue-200",
    badge: "bg-gradient-to-r from-red-500 to-pink-600 text-white",
    loader: "border-blue-400",
  };

  return (
    <>
      <div
        className={`h-full flex flex-col ${theme.bg} transition-colors duration-400   shadow-xl z-0`}
      >
        {/* Header */}
        <div className="p-3 flex-shrink-0 space-y-3 border-b border-gray-500 bg-[#1150af]">
          {width > 100 && (
            <h2 className={`text-lg font-bold ${theme.text}`}>Tin nhắn</h2>
          )}

          {/* Search + nút tạo nhóm */}
          <div className="flex items-center gap-2">
            {width > 100 ? (
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Tìm nhóm hoặc bạn bè..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className={`w-full ${theme.searchBg} ${theme.searchText} px-4 py-2.5 rounded-xl border ${theme.searchFocus} focus:outline-none transition-all duration-300`}
                />
                <Search
                  size={18}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme.searchIcon}`}
                />
              </div>
            ) : (
              <Search size={20} className={theme.searchIcon} />
            )}

            {width > 100 && (
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className={`${theme.button} p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center`}
                title="Tạo nhóm mới"
              >
                <UserPlus size={20} className={theme.buttonIcon} />
              </button>
            )}
          </div>
        </div>

        {/* Danh sách hội thoại */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-900/20 mt-2">
          {loading ? (
            <ChatSkeletonList count={8} />
          ) : hasSearched && results.length === 0 ? (
            <div className="text-center text-blue-300 py-12 text-sm">
              Không tìm thấy cuộc trò chuyện nào
            </div>
          ) : (
            results.map((item) => {
              const isGroup =
                item.group_id && item.group_id !== "000000000000000000000000";
              const isSelected =
                selectedChat?.group_id === item.group_id &&
                selectedChat?.user_id === item.user_id;
              const hasUnread = item.unread_count > 0;
              const isOnline = item.status?.toLowerCase() === "online";

              return (
                <button
                  key={
                    isGroup ? `group_${item.group_id}` : `user_${item.user_id}`
                  }
                  onClick={() =>
                    setSelectedChat({
                      user_id: isGroup ? "" : item.user_id,
                      group_id: isGroup ? item.group_id : "",
                      avatar: item.avatar,
                      display_name: item.display_name,
                      status: item.status,
                      update_at: item.updated_at,
                    })
                  }
                  className={`flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl transition-all duration-300 group border border-gray-400 ${
                    isSelected
                      ? theme.cardActive
                      : `${theme.card} ${theme.cardHover}`
                  }`}
                >
                  <UserAvatar
                    avatar={item.avatar}
                    isOnline={!isGroup && isOnline}
                  />

                  {width > 200 && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p
                          className={`text-sm font-semibold ${
                            theme.text
                          } truncate ${hasUnread ? "font-bold" : ""}`}
                        >
                          {item.display_name}
                          {isGroup && (
                            <span className="ml-1 text-xs text-blue-300/70">
                              (Nhóm)
                            </span>
                          )}
                        </p>
                        {item.last_date && (
                          <span className="text-[11px] text-blue-300/60 flex-shrink-0 ml-2">
                            {timeAgo.format(new Date(item.last_date))}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs ${
                            theme.textSecondary
                          } truncate w-35 ${hasUnread ? "font-medium" : ""}`}
                          dangerouslySetInnerHTML={{
                            __html: `${
                              item.sender_id === user?.data.id ? "Bạn: " : ""
                            }${item.last_message || "Chưa có tin nhắn"}`,
                          }}
                        />
                        {hasUnread && (
                          <span
                            className={`${theme.badge} text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow`}
                          >
                            {item.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onCreateGroup={async () => {
          const res = await conversationApi.getConversation(1, 20, "");
          setResults(res.data.data);
        }}
      />
    </>
  );
}
