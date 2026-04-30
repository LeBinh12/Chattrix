import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { X, Search, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "../UserAvatar";
import { BUTTON_HOVER } from "../../utils/className";

// Types
export interface User {
  id: string;
  display_name: string;
  avatar: string;
  online?: boolean;
}

const PX_ALL = "px-4"

interface UserSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  submitText: string;
  loadingText?: string;
  headerSection?: ReactNode;
  users: User[];
  loading: boolean;
  onSubmit: (selectedIds: string[]) => Promise<void>;
  emptySearchMessage?: string;
  emptyListMessage?: string;
  listTitle?: string;
  showCategories?: boolean;
  minSelection?: number;
  // Thêm props cho infinite scroll
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  singleSelection?: boolean;
  onSearch?: (query: string) => void;
}

const getFirstLetter = (name: string): string => {
  if (!name) return "#";
  const firstChar = name.trim()[0].toUpperCase();
  const normalized = firstChar
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return /[A-Z]/.test(normalized) ? normalized : "#";
};

export default function UserSelectionModal({
  isOpen,
  onClose,
  title,
  submitText,
  loadingText = "Đang xử lý...",
  headerSection,
  users,
  loading,
  onSubmit,
  emptySearchMessage = "Không tìm thấy kết quả phù hợp",
  emptyListMessage = "Không có người dùng nào",
  listTitle = "Danh sách người dùng",
  showCategories = true,
  minSelection = 1,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  singleSelection = false,
  onSearch,
}: UserSelectionModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  console.log("showCategories",showCategories)
  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMembers(new Set());
      setSearchQuery("");
    }
  }, [isOpen]);

  // Infinite scroll observer
  useEffect(() => {
    if (!isOpen || !onLoadMore || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      {
        root: listRef.current,
        threshold: 0,
        rootMargin: "100px",
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
  }, [isOpen, onLoadMore, hasMore, loadingMore]);

  // Notify parent of search changes (debounced)
  useEffect(() => {
    if (!onSearch) return;
    
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(userId)) {
        newSelected.delete(userId);
      } else {
        if (singleSelection) {
          newSelected.clear();
        }
        newSelected.add(userId);
      }
      return newSelected;
    });
  };

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      result = result.filter((user) =>
        user.display_name?.toLowerCase().includes(lowerQuery)
      );
    }
    return result.sort((a, b) => (a.display_name || "").localeCompare(b.display_name || ""));
  }, [users, searchQuery]);

  // Group users by first letter
  const groupedUsers = useMemo(() => {
    const groups = new Map<string, User[]>();
    const keys: string[] = [];

    filteredUsers.forEach((user) => {
      const letter = getFirstLetter(user.display_name);
      if (!groups.has(letter)) {
        groups.set(letter, []);
        keys.push(letter);
      }
      const userList = groups.get(letter);
      if (userList) {
        userList.push(user);
      }
    });

    keys.sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });

    return { groups, keys };
  }, [filteredUsers]);

  const handleSubmit = async () => {
    if (selectedMembers.size < minSelection) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(Array.from(selectedMembers));
      onClose();
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled =
    submitting || selectedMembers.size < minSelection || users.length === 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999] p-4 pb-24 sm:pb-4"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="!bg-white w-full !max-w-[520px] !h-[85vh] !max-h-[85vh] flex flex-col !shadow-2xl !rounded-xl !overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between ${PX_ALL} py-2 border-b-2 border-gray-200`}>
            <p className="text-lg font-semibold text-gray-800">{title}</p>
            <button
              onClick={onClose}
              className={`p-1 ${BUTTON_HOVER} rounded-full transition-colors`}
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white">
            {/* Header Section (Group Info) */}
            {headerSection && headerSection}

            {/* Search Bar */}
            <div className={`${PX_ALL} py-3`}>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập tên..."
                  className="w-full !pl-9 !pr-4 !py-2 bg-gray-50 !rounded-lg !text-sm focus:!outline-none focus:bg-gray-100 focus:ring-1 focus:ring-[#00568c]/20 border border-transparent focus:border-[#00568c]/30 !transition-all !font-medium !placeholder-gray-400"
                />
              </div>
            </div>

            {/* Loading */}
            {loading && users.length === 0 && (
              <div className="flex-1 flex items-center justify-center min-h-[200px]">
                <div className="w-8 h-8 border-2 border-gray-100 border-t-[#00568c] rounded-full animate-spin"></div>
              </div>
            )}

            {/* Members List */}
            {!loading || users.length > 0 ? (
              <div className="flex-1 flex flex-col min-h-0 relative bg-white">
                <div
                  ref={listRef}
                  className={`${PX_ALL} flex-1 overflow-y-auto custom-scrollbar pb-4`}
                >
                  <p className="text-xs font-bold text-gray-800 mb-2 mt-1">{listTitle}</p>
                  {groupedUsers.keys.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm">
                        {searchQuery ? emptySearchMessage : emptyListMessage}
                      </p>
                    </div>
                  ) : (
                    <>
                      {groupedUsers.keys.map((letter) => {
                        const userGroup = groupedUsers.groups.get(letter);
                        if (!userGroup || userGroup.length === 0) return null;

                        return (
                          <div
                            key={letter}
                            id={`section-${letter}`}
                            className="mb-1"
                          >
                            {/* Section Header */}
                            <div className="text-[11px] font-bold text-[#00568c] mb-1 ml-1 sticky top-0 bg-white z-10 py-1">
                              {letter === "#" ? "Khác" : letter}
                            </div>

                            {/* User List */}
                            {userGroup.map((user) => {
                              const isSelected = selectedMembers.has(user.id);

                              return (
                                <div
                                  key={user.id}
                                  onClick={() => toggleMember(user.id)}
                                  className="flex items-center gap-3 py-2 px-2 cursor-pointer
                                    hover:bg-gray-50 transition-all rounded-md group select-none"
                                >
                                  <UserAvatar
                                    avatar={user.avatar}
                                    display_name={user.display_name}
                                    isOnline={user.online}
                                    size={36}
                                    showOnlineStatus={false}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 text-[14px] truncate leading-tight">
                                      {user.display_name}
                                    </p>
                                  </div>
                                  <div
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                                      isSelected
                                        ? "bg-[#00568c] border-[#00568c] shadow-sm"
                                        : "border-gray-200 bg-white group-hover:border-gray-300"
                                    }`}
                                  >
                                    {isSelected && (
                                      <Check size={12} className="text-white" strokeWidth={3} />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                      {/* Infinite Scroll Trigger */}
                    </>
                  )}

                  {/* Infinite Scroll Trigger - Moved outside ternary to always be present if hasMore is true */}
                  {hasMore && (
                    <div ref={observerTarget} className="py-4 flex justify-center min-h-[40px]">
                      {loadingMore && (
                        <div className="w-6 h-6 border-2 border-gray-100 border-t-[#00568c] rounded-full animate-spin"></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={onClose}
              className="!text-sm !px-4 !py-2 !text-gray-600 hover:!text-gray-800 hover:!bg-gray-100 !rounded-lg !transition-colors !font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="!text-sm !px-6 !py-2 bg-[#00568c] hover:bg-[#004775] !text-white !rounded-lg !transition-all !font-medium disabled:!opacity-50 disabled:!cursor-not-allowed !shadow-sm hover:!shadow active:!scale-95 !flex !items-center !gap-2"
            >
              {submitting && (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
              <span>
                {submitting
                  ? loadingText
                  : `${submitText}${
                      selectedMembers.size > 0
                        ? ` (${selectedMembers.size})`
                        : ""
                    }`}
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}