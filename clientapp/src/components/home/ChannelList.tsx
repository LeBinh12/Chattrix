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
  const [activeFilter, setActiveFilter] = useState("favorites");
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

  return (
    <>
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 sm:p-5 flex-shrink-0 border-b border-[#e4e8f1] space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[#7c8aac] font-semibold">
                Danh sách chat
              </p>
              <h2 className="text-sm sm:text-base font-semibold text-[#1e2b4a]">
                Tin nhắn
              </h2>
            </div>

            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white rounded-full bg-gradient-to-r from-[#0172ff] to-[#01c5ff] shadow hover:shadow-md transition"
            >
              <UserPlus size={14} />
              <span className="hidden sm:inline">Nhóm mới</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#6a7798]">
            {["favorites", "recent", "folders"].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-full transition ${
                  activeFilter === filter
                    ? "bg-[#e4edff] text-[#2162ff]"
                    : "hover:bg-[#f1f4fa]"
                }`}
              >
                {filter === "favorites" && "Ưu tiên"}
                {filter === "recent" && "Gần đây"}
                {filter === "folders" && "Phân loại"}
              </button>
            ))}
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
                  className={`flex items-center gap-3 w-full text-left px-3.5 py-2.5 rounded-2xl transition-all border ${
                    isSelected
                      ? "bg-white shadow-lg border-[#bed3ff]"
                      : "bg-white/70 border-transparent hover:border-[#d8def0] hover:bg-white"
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
                          className={`text-[12px] text-[#6f7a95] truncate ${
                            hasUnread ? "font-semibold text-[#1f2a44]" : ""
                          }`}
                          dangerouslySetInnerHTML={{
                            __html: `${
                              item.sender_id === user?.data.id ? "Bạn: " : ""
                            }${item.last_message || "Chưa có tin nhắn"}`,
                          }}
                        />
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
