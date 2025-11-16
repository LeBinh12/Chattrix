import { motion } from "framer-motion";
import { formatTimestamp } from "../../logic/FormatTimestamp";
import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { userAtom } from "../../recoil/atoms/userAtom";
import type { Conversation } from "../../types/conversation";
import { conversationApi } from "../../api/conversation";
import { socketManager } from "../../api/socket";
import { Search } from "lucide-react";
import { Howl } from "howler";
import { TING } from "../../assets/paths";
import { LOGO } from "../../assets/paths";

type Props = {
  onFriend: (friend: Conversation) => void;
  onOpenId?: (id: string) => void;
};

const ding = new Howl({
  src: [TING],
  preload: true,
  volume: 0.8,
});

export default function MessagesTab({ onFriend, onOpenId }: Props) {
  const user = useRecoilValue(userAtom);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [keyword, setKeyword] = useState("");

  const playNotification = () => ding.play();

  // Lấy danh sách hội thoại ban đầu
  useEffect(() => {
    if (!user?.data?.id) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const res = await conversationApi.getConversation(1, 20, keyword);
        setConversations(res.data.data || []);
      } catch (err) {
        console.error("❌ Lỗi lấy danh sách hội thoại:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user?.data?.id, keyword]);

  // Xử lý tin nhắn realtime
  useEffect(() => {
    if (!user?.data?.id) return;
    socketManager.connect(user.data.id);

    const handleRealtime = (data: any) => {
      if (data.type !== "conversations" || !data.message) return;

      const msg = data.message;
      setConversations((prev) => {
        const isGroup =
          msg.group_id && msg.group_id !== "000000000000000000000000";
        const idToMatch = isGroup ? msg.group_id : msg.user_id;

        const existIndex = prev.findIndex((c) =>
          isGroup ? c.group_id === idToMatch : c.user_id === idToMatch
        );

        const oldConv = existIndex >= 0 ? prev[existIndex] : null;

        const updatedConv: Conversation = {
          user_id: isGroup ? "" : msg.user_id,
          group_id: isGroup ? msg.group_id : "",
          display_name: oldConv?.display_name || msg.display_name || "Unknown",
          avatar: oldConv?.avatar || msg.avatar || "",
          last_message: msg.last_message || "",
          last_message_type: msg.last_message_type || "text",
          last_date: new Date().toISOString(),
          unread_count:
            msg.sender_id !== user.data.id
              ? (oldConv?.unread_count || 0) + 1
              : oldConv?.unread_count || 0,
          status: oldConv?.status || "offline",
          updated_at: new Date().toISOString(),
          sender_id: msg.sender_id,
        };

        // Nếu đã tồn tại conversation, xóa cũ và thêm mới lên đầu
        if (existIndex >= 0) {
          const newList = [...prev];
          newList.splice(existIndex, 1);
          playNotification();
          return [updatedConv, ...newList];
        }

        playNotification();
        return [updatedConv, ...prev];
      });
    };

    socketManager.addListener(handleRealtime);
    return () => socketManager.removeListener(handleRealtime);
  }, [user?.data?.id]);

  // Sắp xếp theo thời gian mới nhất
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.last_date).getTime() - new Date(a.last_date).getTime()
  );

  const renderMessageContent = (conv: Conversation) => {
    if (["image", "video", "file"].includes(conv.last_message_type)) {
      const typeText =
        conv.last_message_type === "image"
          ? "ảnh"
          : conv.last_message_type === "video"
          ? "video"
          : "tệp";
      return (
        <span className="text-gray-700 font-medium">
          {conv.display_name} đã gửi{" "}
          {conv.unread_count > 1
            ? `${conv.unread_count} ${typeText}`
            : `1 ${typeText}`}
        </span>
      );
    }
    return (
      <span className="text-gray-700 font-medium">
        <div dangerouslySetInnerHTML={{ __html: conv.last_message }} />
      </span>
    );
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-4xl font-bold text-center text-white">Nhắn Tin</h1>
      <h5 className="text-2xl font-extrabold text-[#ecf1fe] text-center">
        Danh sách tin nhắn
      </h5>

      {/* Search */}
      <motion.div
        className="relative w-full sm:w-2/3 mx-auto"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-gray-300" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setKeyword(searchTerm.trim());
            }}
            className="w-full bg-transparent text-white placeholder-gray-300 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
          />
        </div>
      </motion.div>

      {loading ? (
        <p className="text-center text-white">Đang tải...</p>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-3"
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          {sortedConversations.map((conv) => (
            <motion.div
              key={conv.user_id || conv.group_id}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div
                onClick={() => {
                  onFriend(conv);
                  onOpenId?.(conv.user_id || conv.group_id);
                }}
                className="flex items-center p-4 bg-purple-50 rounded-lg shadow-sm hover:bg-[#cedbfb] transition cursor-pointer"
              >
                <div className="relative w-12 h-12 mr-3">
                  <img
                    src={
                      conv.avatar && conv.avatar !== "null"
                        ? `http://localhost:3000/v1/upload/media/${conv.avatar}`
                        : LOGO
                    }
                    alt={conv.display_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xl font-semibold">{conv.display_name}</p>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(conv.last_date)}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-black line-clamp-2">
                    {renderMessageContent(conv)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};
