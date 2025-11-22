import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Search, User, Calendar, ChevronDown } from "lucide-react";
import { useRecoilValue } from "recoil";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { searchApi } from "../../api/searchApi";
import { formatTimeAgo } from "../../utils/tomeAgo";
import { LOGO } from "../../assets/paths";

interface SearchResult {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  highlightedContent?: string;
}

export default function ChatSearchPanel() {
  const selectedChat = useRecoilValue(selectedChatState);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSender, setSelectedSender] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Tự động tạo danh sách người gửi
  const uniqueSenders = useMemo(() => {
    const senders = new Set(searchResults.map((x) => x.senderName));
    return Array.from(senders);
  }, [searchResults]);

  useEffect(() => {
    const doSearch = async () => {
      if (!searchQuery.trim() || !selectedChat) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);

      try {
        const res = await searchApi.search(
          selectedChat?.user_id, // receiver_id
          searchQuery, // search text
          selectedChat?.group_id // group_id nếu có
        );

        let items = res.data.data;

        // Apply filter người gửi
        if (selectedSender !== "all") {
          items = items.filter((item) => item.sender_name === selectedSender);
        }

        // Apply filter ngày
        if (selectedDate === "newest") {
          items.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
        } else if (selectedDate === "oldest") {
          items.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
        }

        // Highlight text
        const highlighted = items.map((item) => {
          const regex = new RegExp(`(${searchQuery})`, "gi");
          const highlightedContent = item.content_raw.replace(
            regex,
            '<span class="text-[#0068ff] font-semibold">$1</span>'
          );

          return {
            id: item.id,
            senderId: item.sender_id,
            senderName: item.sender_name,
            senderAvatar:
              item.sender_avatar === "null" || !item.sender_avatar
                ? LOGO
                : `http://localhost:3000/v1/upload/media/${item.sender_avatar}`,
            content: item.content_raw,
            highlightedContent,
            timestamp: formatTimeAgo(item.created_at),
          };
        });

        setSearchResults(highlighted);
      } catch (error) {
        console.error("Search error:", error);
      }

      setIsSearching(false);
    };

    const timer = setTimeout(doSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedSender, selectedDate, selectedChat]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleResultClick = (resultId: string) => {
    console.log("Navigate to message:", resultId);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-4 py-3.5 flex items-center justify-between border-b border-[#e4e8f1]">
        <h2 className="text-[#1e2b4a] text-base font-semibold">
          Tìm kiếm trong trò chuyện
        </h2>
      </div>

      {/* Search Input */}
      <div className="flex-shrink-0 p-4 bg-white ">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#010616]"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nhập từ khóa tìm kiếm"
            className="w-full bg-[#f5f7fb] text-[#1e2b4a] pl-10 pr-16 py-2.5 rounded-lg border border-transparent focus:border-[#5a7de1] focus:bg-white focus:outline-none transition-all text-sm placeholder:text-[#a8b3c9]"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a7de1] hover:text-[#4361d1] text-sm transition-colors font-medium"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {/* Filters */}
      <div className="flex-shrink-0 px-4 bg-white  flex items-center gap-2 text-xs">
        <span className="text-[#5a6a8a] font-medium">Lọc theo:</span>

        {/* Sender Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsFilterOpen(!isFilterOpen);
              setIsDateOpen(false);
            }}
            className="flex items-center gap-1 px-1.5 h-5 bg-white text-[#1e2b4a] rounded-md border border-[#dce3f1] hover:border-[#5a7de1] hover:bg-[#f8f9fd] transition-all text-xs"
          >
            <User size={14} />
            <span className="text-xs font-medium">
              {selectedSender === "all" ? "Người gửi" : selectedSender}
            </span>
            <ChevronDown size={14} />
          </button>

          {isFilterOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsFilterOpen(false)}
              />
              <div className="absolute top-full mt-1 left-0 bg-white border border-[#e4e8f1] rounded-lg shadow-xl py-0.5 z-20 min-w-[150px]">
                <button
                  onClick={() => {
                    setSelectedSender("all");
                    setIsFilterOpen(false);
                  }}
                  className={`w-full px-2 py-1 text-left text-xs ${
                    selectedSender === "all"
                      ? "text-[#0068ff] font-medium bg-[#f0f7ff]"
                      : "text-[#1e2b4a] hover:bg-[#f8f9fd]"
                  }`}
                >
                  Tất cả
                </button>

                {uniqueSenders.map((sender) => (
                  <button
                    key={sender}
                    onClick={() => {
                      setSelectedSender(sender);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full px-2 py-1 text-left text-xs ${
                      selectedSender === sender
                        ? "text-[#0068ff] font-medium bg-[#f0f7ff]"
                        : "text-[#1e2b4a] hover:bg-[#f8f9fd]"
                    }`}
                  >
                    {sender}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Date Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsDateOpen(!isDateOpen);
              setIsFilterOpen(false);
            }}
            className="flex items-center gap-1 px-1.5 h-5 bg-white text-[#1e2b4a] rounded-md border border-[#dce3f1] hover:border-[#5a7de1] hover:bg-[#f8f9fd] transition-all text-xs"
          >
            <Calendar size={14} />
            <span className="text-xs font-medium">Ngày gửi</span>
            <ChevronDown size={14} />
          </button>

          {isDateOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDateOpen(false)}
              />
              <div className="absolute top-full mt-1 left-0 bg-white border border-[#e4e8f1] rounded-lg shadow-xl py-0.5 z-20 min-w-[140px]">
                <button
                  onClick={() => {
                    setSelectedDate("newest");
                    setIsDateOpen(false);
                  }}
                  className="w-full px-2 py-1 text-left text-xs hover:bg-[#f8f9fd]"
                >
                  Mới nhất
                </button>
                <button
                  onClick={() => {
                    setSelectedDate("oldest");
                    setIsDateOpen(false);
                  }}
                  className="w-full px-2 py-1 text-left text-xs hover:bg-[#f8f9fd]"
                >
                  Cũ nhất
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {searchQuery && (
          <div className="flex-shrink-0 px-4 py-2.5 bg-white border-b border-[#e4e8f1]">
            <span className="text-[#5a6a8a] text-sm font-medium">Tin nhắn</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-3 border-[#5a7de1] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#8e96ac] text-sm mt-4 font-medium">
                Đang tìm kiếm...
              </p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="divide-y divide-[#f5f7fb]">
              {searchResults.map((result) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-3 hover:bg-[#f8f9fd] cursor-pointer"
                  onClick={() => handleResultClick(result.id)}
                >
                  <div className="flex gap-3">
                    <img
                      src={result.senderAvatar}
                      className="w-10 h-10 rounded-full"
                      alt={result.senderName}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[#1e2b4a] text-sm font-semibold">
                          {result.senderName}
                        </span>
                        <span className="text-[#a8b3c9] text-xs font-medium">
                          {result.timestamp}
                        </span>
                      </div>
                      <p
                        className="text-[#5a6a8a] text-sm line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: result.highlightedContent || result.content,
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="py-20 text-center">
              <Search size={32} className="mx-auto text-[#a8b3c9]" />
              <p className="text-[#1e2b4a] text-sm font-semibold mt-4">
                Không tìm thấy kết quả
              </p>
              <p className="text-[#8e96ac] text-xs">Thử từ khóa khác</p>
            </div>
          ) : (
            <div className="py-20 text-center">
              <Search size={32} className="mx-auto text-[#a8b3c9]" />
              <p className="text-[#1e2b4a] text-sm font-semibold mt-4">
                Tìm kiếm tin nhắn
              </p>
              <p className="text-[#8e96ac] text-xs">Nhập từ khóa để bắt đầu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
