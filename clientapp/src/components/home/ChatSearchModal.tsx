import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, User, Calendar, ChevronDown, ChevronLeft } from "lucide-react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { DateRangePicker } from "rsuite";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { activePanelAtom } from "../../recoil/atoms/uiAtom";
import { searchApi } from "../../api/searchApi";
import { formatTimeAgo } from "../../utils/tomeAgo";
import { messageIDAtom } from "../../recoil/atoms/messageAtom";
import { userAtom } from "../../recoil/atoms/userAtom";
import { BUTTON_HOVER } from "../../utils/className";
import UserAvatar from "../UserAvatar";

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
  { value: "others", label: "Người khác gửi" },
];

export default function ChatSearchPanel() {
  const selectedChat = useRecoilValue(selectedChatState);
  const user = useRecoilValue(userAtom);
  const setActivePanel = useSetRecoilState(activePanelAtom);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSender, setSelectedSender] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customRange, setCustomRange] = useState<[Date, Date] | null>(null);
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

  const calculateDateRange = useCallback(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (dateFilter) {
      case "today":
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        start = new Date(yesterday.setHours(0, 0, 0, 0));
        end = new Date(yesterday.setHours(23, 59, 59, 999));
        break;
      case "last7days":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      case "custom":
        if (customRange && customRange[0]) start = customRange[0];
        if (customRange && customRange[1]) {
          end = new Date(customRange[1]);
          end.setHours(23, 59, 59, 999);
        }
        break;
      default:
        return { start: null, end: null };
    }

    return {
      start: start ? start.toISOString() : null,
      end: end ? end.toISOString() : null
    };
  }, [dateFilter, customRange]);

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

      const { start, end } = calculateDateRange();

      try {
        const res = await searchApi.search(
          selectedChat?.user_id,
          searchQuery,
          selectedChat?.group_id,
          cursor,
          start,
          end
        );

        let items = res.data.data;

        // Apply filter người gửi
        if (selectedSender === "me") {
          items = items.filter((item) => item.sender_id === user?.data.id);
        } else if (selectedSender === "others") {
          items = items.filter((item) => item.sender_id !== user?.data.id);
        }

        // Highlight text
        const highlighted = items.map((item) => {
          const regex = new RegExp(`(${searchQuery})`, "gi");
          const highlightedContent = item.content_raw.replace(
            regex,
            '<span class="text-[#00568c] font-semibold">$1</span>'
          );

          return {
            id: item.id,
            senderId: item.sender_id,
            senderName: item.sender_name,
            senderAvatar: item.sender_avatar ?? "null",
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
    [searchQuery, selectedSender, selectedChat, user?.data.id, calculateDateRange]
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
    dateFilter,
    customRange,
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
    if (window.innerWidth < 1024) {
      setActivePanel("none");
    }
  };

  const dateFilterOptions = [
    { value: "all", label: "Tất cả" },
    { value: "today", label: "Hôm nay" },
    { value: "yesterday", label: "Hôm qua" },
    { value: "last7days", label: "7 ngày qua" },
    { value: "custom", label: "Tùy chọn ngày" },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-4 py-3.5 flex items-center gap-3 border-b border-[#e4e8f1]">
        <button
          onClick={() => setActivePanel("none")}
          className={`${BUTTON_HOVER} p-1.5 rounded-lg transition`}
        >
          <ChevronLeft size={24} />
        </button>
        <p className="text-gray-900 text-base font-semibold">
          Tìm kiếm trong trò chuyện
        </p>
      </div>

      {/* Search Input */}
      <div className="flex-shrink-0 p-4 bg-white">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nhập từ khóa tìm kiếm"
                className={`
                  w-full h-9 pl-9 pr-3 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-[#00568c] border border-transparent transition-all font-medium
                  bg-gray-50 text-gray-900 placeholder-gray-400
                  focus:bg-white focus:border-[#00568c]/30
                `}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00568c] text-sm transition-colors font-medium cursor-pointer"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 px-4 pb-2 bg-white flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-900 font-medium">Lọc theo:</span>

          {/* Sender Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setIsFilterOpen(!isFilterOpen);
                setIsDateOpen(false);
              }}
              className="flex items-center gap-1 px-1.5 h-5 bg-white text-gray-600 rounded-md border border-gray-200 hover:border-[#00568c] hover:bg-gray-50 transition-all text-xs"
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
                          ? "text-[#00568c] font-medium bg-blue-50"
                          : "text-gray-600 hover:bg-gray-50"
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
              className="flex items-center gap-1 px-1.5 h-5 bg-white text-gray-600 rounded-md border border-gray-200 hover:border-[#00568c] hover:bg-gray-50 transition-all text-xs"
            >
              <Calendar size={14} />
              <span className="text-xs font-medium">
                {dateFilterOptions.find(opt => opt.value === dateFilter)?.label || "Ngày gửi"}
              </span>
              <ChevronDown size={14} />
            </button>

            {isDateOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDateOpen(false)}
                />
                <div className="absolute top-full mt-1 left-0 bg-white border border-[#e4e8f1] rounded-lg shadow-xl py-0.5 z-20 min-w-[140px]">
                  {dateFilterOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setDateFilter(option.value);
                        setIsDateOpen(false);
                      }}
                      className={`w-full px-2 py-1 text-left text-xs ${
                        dateFilter === option.value
                          ? "text-[#00568c] font-medium bg-blue-50"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === "custom" && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex flex-col gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200"
          >
            <style>{`
              .custom-range-picker .rs-picker-toggle {
                height: 32px !important;
                display: flex !important;
                align-items: center !important;
                border: 1px solid #e5e7eb !important;
                background-color: white !important;
              }
              .custom-range-picker .rs-picker-toggle-value {
                color: #111827 !important;
                font-size: 13px !important;
              }
              .custom-range-picker .rs-btn-icon {
                color: #9ca3af !important;
              }
              .rs-picker-daterange-menu {
                z-index: 9999 !important;
              }
            `}</style>
            <span className="text-[10px] text-gray-500 font-semibold ml-1">Chọn khoảng thời gian</span>
            <DateRangePicker
              value={customRange}
              onChange={setCustomRange}
              placeholder="Từ ngày - Đến ngày"
              size="sm"
              block
              format="dd/MM/yyyy"
              character=" - "
              showOneCalendar
              editable={false}
              cleanable={false}
              className="custom-range-picker"
            />
          </motion.div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {searchQuery && (
          <div className="flex-shrink-0 px-4 py-2.5 bg-white border-b border-[#e4e8f1]">
            <span className="text-gray-900 text-sm font-medium">
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
                  className={`px-4 py-3 ${BUTTON_HOVER}  cursor-pointer`}
                  onClick={() => handleResultClick(result.id)}
                >
                  <div className="flex gap-3">
                    <UserAvatar
                      avatar={result.senderAvatar}
                      display_name={result.senderName}
                      showOnlineStatus={false}
                      size={40}
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
              <Search size={32} className="mx-auto text-gray-400" />
              <p className="text-gray-900 text-sm font-semibold mt-4">
                Tìm kiếm tin nhắn
              </p>
              <p className="text-gray-500 text-xs">Nhập từ khóa để bắt đầu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
