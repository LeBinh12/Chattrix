import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, User, Calendar, ChevronDown } from "lucide-react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { searchApi } from "../../api/searchApi";
import { formatTimeAgo } from "../../utils/tomeAgo";
import { LOGO } from "../../assets/paths";
import { messageIDAtom } from "../../recoil/atoms/messageAtom";
import { userAtom } from "../../recoil/atoms/userAtom";
import { API_ENDPOINTS } from "../../config/api";

interface SearchResult {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  highlightedContent?: string;
  created_at: string; // Thêm field này để tracking cursor
}

const senderOptions = [
  { value: "all", label: "Tất cả" },
  { value: "me", label: "Tôi gửi" },
  { value: "others", label: "Nhóm" },
];

export default function ChatSearchPanel() {
  const selectedChat = useRecoilValue(selectedChatState);
  const user = useRecoilValue(userAtom);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSender, setSelectedSender] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const setMessageID = useSetRecoilState(messageIDAtom);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset khi thay đổi query hoặc filter
  const resetSearch = useCallback(() => {
    setSearchResults([]);
    setNextCursor(null);
    setHasMore(true);
  }, []);

  // Hàm fetch data
  const fetchSearchResults = useCallback(
    async (cursor: string | null = null, isInitial: boolean = false) => {
      if (!searchQuery.trim() || !selectedChat) {
        setSearchResults([]);
        return;
      }

      if (isInitial) {
        setIsSearching(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await searchApi.search(
          selectedChat?.user_id,
          searchQuery,
          selectedChat?.group_id,
          cursor
        );

        let items = res.data.data;

        // Apply filter người gửi
        if (selectedSender === "me") {
          items = items.filter((item) => item.sender_id === user?.data.id);
        } else if (selectedSender === "others") {
          items = items.filter((item) => item.sender_id !== user?.data.id);
        }

        // Apply filter ngày
        if (selectedDate === "newest" || !selectedDate) {
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
                : `${API_ENDPOINTS.STREAM_MEDIA}/${item.sender_avatar}`,
            content: item.content_raw,
            highlightedContent,
            timestamp: formatTimeAgo(item.created_at),
            created_at: item.created_at,
          };
        });

        if (isInitial) {
          setSearchResults(highlighted);
        } else {
          setSearchResults((prev) => [...prev, ...highlighted]);
        }

        // Update cursor và hasMore
        setNextCursor(
          res.data.next_cursor !== null ? String(res.data.next_cursor) : null
        );
        setHasMore(!!res.data.next_cursor && highlighted.length > 0);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
        setIsLoadingMore(false);
      }
    },
    [searchQuery, selectedSender, selectedDate, selectedChat, user?.data.id]
  );

  // Initial search với debounce
  useEffect(() => {
    resetSearch();
    const timer = setTimeout(() => {
      fetchSearchResults(null, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    searchQuery,
    selectedSender,
    selectedDate,
    selectedChat,
    user?.data.id,
    resetSearch,
    fetchSearchResults,
  ]);

  // Intersection Observer cho lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isSearching &&
          !isLoadingMore &&
          nextCursor
        ) {
          fetchSearchResults(nextCursor, false);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isSearching, isLoadingMore, nextCursor, fetchSearchResults]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    resetSearch();
  };

  const handleResultClick = (resultId: string) => {
    setMessageID(resultId);
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
      <div className="flex-shrink-0 p-4 bg-white">
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
      <div className="flex-shrink-0 px-4 bg-white flex items-center gap-2 text-xs">
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
              {senderOptions.find((opt) => opt.value === selectedSender)
                ?.label || "Người gửi"}
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
                {senderOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedSender(option.value);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full px-2 py-1 text-left text-xs ${
                      selectedSender === option.value
                        ? "text-[#0068ff] font-medium bg-[#f0f7ff]"
                        : "text-[#1e2b4a] hover:bg-[#f8f9fd]"
                    }`}
                  >
                    {option.label}
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
                  className={`w-full px-2 py-1 text-left text-xs ${
                    selectedDate === "newest"
                      ? "text-[#0068ff] font-medium bg-[#f0f7ff]"
                      : "text-[#1e2b4a] hover:bg-[#f8f9fd]"
                  }`}
                >
                  Mới nhất
                </button>
                <button
                  onClick={() => {
                    setSelectedDate("oldest");
                    setIsDateOpen(false);
                  }}
                  className={`w-full px-2 py-1 text-left text-xs ${
                    selectedDate === "oldest"
                      ? "text-[#0068ff] font-medium bg-[#f0f7ff]"
                      : "text-[#1e2b4a] hover:bg-[#f8f9fd]"
                  }`}
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
            <span className="text-[#5a6a8a] text-sm font-medium">
              Tin nhắn ({searchResults.length})
            </span>
          </div>
        )}

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
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

              {/* Loading More Indicator */}
              {isLoadingMore && (
                <div className="py-6 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-[#5a7de1] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Intersection Observer Target */}
              <div ref={observerTarget} className="h-4" />

              {/* End of Results */}
              {!hasMore && searchResults.length > 0 && (
                <div className="py-6 text-center">
                  <p className="text-[#a8b3c9] text-xs">
                    Đã hiển thị tất cả kết quả
                  </p>
                </div>
              )}
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
