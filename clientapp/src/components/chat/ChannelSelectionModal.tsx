import { useState, useMemo, useEffect, useRef } from "react";
import { X, Search, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRecoilState } from "recoil";
import { conversationListAtom } from "../../recoil/atoms/conversationListAtom";
import type { Conversation } from "../../types/conversation";
import UserAvatar from "../UserAvatar";
import { BUTTON_HOVER } from "../../utils/className";
import { conversationApi } from "../../api/conversation";
import ChatSkeletonList from "../../skeleton/ChatSkeletonList";

interface ChannelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (selectedTargets: { receiverIds: string[]; groupIds: string[] }) => Promise<void>;
}

const PX_ALL = "px-4";

export default function ChannelSelectionModal({
  isOpen,
  onClose,
  onSubmit,
}: ChannelSelectionModalProps) {
  const [conversations, setConversations] = useRecoilState(conversationListAtom);
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Pagination & Lazy loading state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const listRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearchQuery("");
      setPage(1);
      // Fetch initial data or clear old results
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    setIsLoadingInitial(true);
    try {
      const res = await conversationApi.getConversation(1, 10, "");
      // Update global conversations for "Recent"
      setConversations(res.data.data);
      setPage(1);
      setHasMore(res.data.data.length === 10);
    } catch (error) {
      console.error("Fetch initial error:", error);
    } finally {
      setIsLoadingInitial(false);
    }
  };

  // Handle search with debounce
  useEffect(() => {
    if (!isOpen) return;

    if (searchQuery === "") {
        setSearchResults([]);
        setPage(1);
        setHasMore(conversations.length >= 10);
        setIsSearching(false);
        return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  const handleSearch = async (query: string) => {
    setLoadingMore(true);
    setPage(1);
    try {
      const res = await conversationApi.getConversation(1, 20, query);
      setSearchResults(res.data.data);
      setHasMore(res.data.data.length === 20);
    } catch (error) {
      console.error("Search error:", error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
      setIsSearching(false);
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    if (!isOpen || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      {
        root: listRef.current,
        threshold: 0.1,
      }
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
  }, [isOpen, hasMore, loadingMore, page, searchQuery]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    
    try {
      const limit = searchQuery ? 20 : 10;
      const res = await conversationApi.getConversation(nextPage, limit, searchQuery);
      const newData = res.data.data;
      
      if (newData.length > 0) {
        const updater = (prev: Conversation[]) => {
          const existingIds = new Set(prev.map(c => {
            const isGroup = c.group_id && c.group_id !== "000000000000000000000000";
            return isGroup ? `group_${c.group_id}` : `user_${c.user_id}`;
          }));
          
          const uniqueNewData = newData.filter(c => {
            const isGroup = c.group_id && c.group_id !== "000000000000000000000000";
            const id = isGroup ? `group_${c.group_id}` : `user_${c.user_id}`;
            return !existingIds.has(id);
          });
          
          return [...prev, ...uniqueNewData];
        };

        if (searchQuery) {
            setSearchResults(prev => updater(prev));
        } else {
            setConversations(prev => updater(prev));
        }

        setPage(nextPage);
        setHasMore(newData.length === limit);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Load more error:", error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const displayedConversations = useMemo(() => {
    return searchQuery ? searchResults : conversations;
  }, [conversations, searchResults, searchQuery]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 50) {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return;

    setSubmitting(true);
    const receiverIds: string[] = [];
    const groupIds: string[] = [];

    selectedIds.forEach((id) => {
      if (id.startsWith("group_")) {
        groupIds.push(id.replace("group_", ""));
      } else {
        receiverIds.push(id.replace("user_", ""));
      }
    });

    try {
      await onSubmit({ receiverIds, groupIds });
      onClose();
    } catch (error) {
      console.error("Forwarding failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="!fixed !inset-0 !bg-black/30 !flex !items-center !justify-center !z-[9999] !p-4"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="!bg-white !w-full !max-w-[520px] !h-auto !max-h-[85vh] !flex !flex-col !shadow-2xl !rounded-xl !overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          {/* Header */}
          <div className={`!flex !items-center !justify-between ${PX_ALL} !py-2 !border-b-2 !border-gray-200`}>
            <h2 className="!text-lg !font-semibold !text-gray-800">Chuyển tiếp tin nhắn</h2>
            <button
              onClick={onClose}
              className={`!p-1 ${BUTTON_HOVER} !rounded-full !transition-colors`}
            >
              <X size={24} className="!text-gray-600" />
            </button>
          </div>

          <div className="!flex-1 !overflow-hidden !flex !flex-col !min-h-0">
            {/* Search */}
            <div className={`${PX_ALL} !py-3`}>
              <div className="!relative">
                <Search
                  size={18}
                  className="!absolute !left-3 !top-1/2 !-translate-y-1/2 !text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.trim() !== "") {
                      setIsSearching(true);
                    }
                  }}
                  placeholder="Tìm kiếm trò chuyện..."
                  className="!w-full !h-9 !pl-9 !pr-4 !py-2 !bg-[#f8f3ed] !rounded-lg !text-sm focus:!outline-none focus:!bg-[#f5ede4] !border !border-transparent !transition-all !font-medium placeholder-gray-400"
                />
              </div>
            </div>

            {/* Selection Status */}
            {selectedIds.size > 0 && (
              <div className={`${PX_ALL} !pb-2`}>
                <p className="!text-xs !font-semibold !text-blue-600">
                  Đã chọn {selectedIds.size}/50
                </p>
              </div>
            )}

            {/* List */}
            <div
              ref={listRef}
              className="!flex-1 !overflow-y-auto !custom-scrollbar !px-2 !pb-2"
            >
              <p className="!text-xs !font-bold !text-gray-800 !mb-2 !mt-1 !ml-2">Trò chuyện gần đây</p>
              
              {searchQuery === "" && isLoadingInitial && conversations.length === 0 ? (
                <ChatSkeletonList count={5} />
              ) : searchQuery !== "" && isSearching && searchResults.length === 0 ? (
                <ChatSkeletonList count={5} />
              ) : displayedConversations.length === 0 ? (
                <div className="!text-center !py-8">
                  <p className="!text-gray-400 !text-sm">Không tìm thấy kết quả nào</p>
                </div>
              ) : (
                <>
                  {displayedConversations.map((conv) => {
                    const isGroup = conv.group_id && conv.group_id !== "000000000000000000000000";
                    const id = isGroup ? `group_${conv.group_id}` : `user_${conv.user_id}`;
                    const isSelected = selectedIds.has(id);

                    return (
                      <div
                        key={id}
                        onClick={() => toggleSelection(id)}
                        className="!flex !items-center !gap-3 !py-2 !px-2 !cursor-pointer hover:!bg-gray-50 !transition-all !rounded-md !group !select-none"
                      >
                        <UserAvatar
                          avatar={conv.avatar}
                          display_name={conv.display_name}
                          size={40}
                          showOnlineStatus={false}
                        />
                        <div className="!flex-1 !min-w-0">
                          <p className="!font-medium !text-gray-900 !text-[14px] !truncate !leading-tight">
                            {conv.display_name}
                          </p>
                          <p className="!text-xs !text-gray-500 !truncate !mt-0.5">
                            {isGroup ? "Nhóm" : "Cá nhân"}
                          </p>
                        </div>
                        <div
                          className={`!w-5 !h-5 !rounded-full !border !flex !items-center !justify-center !flex-shrink-0 !transition-all ${
                            isSelected
                              ? "!bg-blue-500 !border-blue-500 !shadow-sm"
                              : "!border-gray-200 !bg-white group-hover:!border-gray-300"
                          } ${!isSelected && selectedIds.size >= 50 ? "!opacity-30 !cursor-not-allowed" : ""}`}
                        >
                          {isSelected && (
                            <Check size={12} className="!text-white" strokeWidth={3} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Bottom Sentinel for Infinite Scroll */}
                  <div ref={observerTarget} className="!h-10 !w-full !flex !justify-center !py-4">
                    {loadingMore && (
                      <div className="!w-5 !h-5 !border-2 !border-blue-100 border-t-blue-500 !rounded-full !animate-spin"></div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="!flex !items-center !justify-end !gap-3 !px-4 !py-3 !border-t !border-gray-100 !bg-gray-50/50">
            <button
              onClick={onClose}
              className="!text-sm !px-4 !py-2 !text-gray-600 hover:!text-gray-800 hover:!bg-gray-100 !rounded-lg !transition-colors !font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting || selectedIds.size === 0}
              className="!text-sm !px-6 !py-2 !bg-[#5b340a] hover:!bg-[#673b0c] !text-white !rounded-lg !transition-all !font-medium disabled:!opacity-50 disabled:!cursor-not-allowed !shadow-sm hover:!shadow active:!scale-95 !flex !items-center !gap-2"
            >
              {submitting && (
                <div className="!w-3 !h-3 !border-2 !border-white/30 border-t-white !rounded-full !animate-spin"></div>
              )}
              <span>
                {submitting ? "Đang gửi..." : `Chuyển tiếp${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
