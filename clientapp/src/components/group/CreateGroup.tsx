import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Search, Camera, Check } from "lucide-react";
import { conversationApi } from "../../api/conversation";
import { toast } from "react-toastify";
import { groupApi } from "../../api/group";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "../UserAvatar";
import { socketManager } from "../../api/socket";
import { useRecoilValue } from "recoil";
import { userAtom } from "../../recoil/atoms/userAtom";

// Types
interface User {
  id: string;
  name: string;
  avatar: string;
  online?: boolean;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "customers", label: "Customers" },
  { id: "family", label: "Family" },
  { id: "work", label: "Work" },
  { id: "friends", label: "Friends" },
  { id: "todo", label: "Todo" },
];

const getFirstLetter = (name: string): string => {
  if (!name) return "#";
  const firstChar = name.trim()[0].toUpperCase();
  const normalized = firstChar
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return /[A-Z]/.test(normalized) ? normalized : "#";
};

export default function CreateGroupModal({
  isOpen,
  onClose,
}: CreateGroupModalProps) {
  const userRecoil = useRecoilValue(userAtom)
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempQuery, setTempQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch users
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await conversationApi.getConversation(1, 50, searchQuery);
        if (res.status === 200) {
          const mappedUsers: User[] = res.data.data
            .filter((item) => !!item.user_id)
            .map((item) => ({
              id: item.user_id!,
              name: item.display_name,
              avatar: item.avatar || "https://via.placeholder.com/150",
              online: item.status === "online",
            }));
          setUsers(mappedUsers);
        }
      } catch (error) {
        console.error("Lỗi tải danh sách user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, searchQuery]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setGroupName("");
      setGroupImage("");
      setImagePreview("");
      setSearchQuery("");
      setSelectedMembers(new Set());
      setTempQuery("");
      setActiveCategory("all");
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setGroupImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMember = (userId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedMembers(newSelected);
  };

  const groupedUsers = useMemo(() => {
    const groups = new Map<string, User[]>();
    const keys: string[] = [];

    users.forEach((user) => {
      const letter = getFirstLetter(user.name);
      if (!groups.has(letter)) {
        groups.set(letter, []);
        keys.push(letter);
      }
      groups.get(letter)!.push(user);
    });

    // Sắp xếp A-Z, # để cuối
    keys.sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });

    return { groups, keys };
  }, [users]);

  const handleSubmit = async () => {
    if (!groupName.trim() || selectedMembers.size === 0) {
      toast.error("Vui lòng nhập tên nhóm và chọn ít nhất 1 thành viên!");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("name", groupName);
      formData.append("status", "active");

      if (groupImage) {
        const blob = await fetch(groupImage).then((res) => res.blob());
        const file = new File([blob], "group.jpg", { type: blob.type });
        formData.append("image", file);
      }

      const res = await groupApi.addGroup(formData);
      if (res.status === 200) {        
        const memberIds = Array.from(selectedMembers);

        const members = memberIds.map(id => ({
          user_id: id,
          role: "member"
        }));
        
        socketManager.sendAddGroupMember(userRecoil?.data.id ?? "", userRecoil?.data.display_name ?? "",
          res.data.id, res.data.name, res.data.image, members, "create_group")
        toast.success("Tạo nhóm thành công!");
        onClose();
      } else {
        toast.error("Không thể tạo nhóm!");
      }
    } catch (error) {
      console.error("Lỗi tạo nhóm:", error);
      toast.error("Đã xảy ra lỗi khi tạo nhóm!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearchQuery(tempQuery);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="bg-white w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Tạo nhóm</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 ">
              {/* Group Info Section */}
              <div className="px-5 py-3 bg-gray-50 flex items-center gap-4 border-b border-gray-200">
                <label className="cursor-pointer relative">
                  <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-300 shadow-sm hover:shadow-md transition-all">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Group"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera size={18} className="text-gray-600" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Tên nhóm..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>
              {/* Search Bar */}
              <div className="px-5 py-1">
                <div className="relative">
                  <Search
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={tempQuery}
                    onChange={(e) => setTempQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Nhập tên, số điện thoại, hoặc danh sách số điện thoại"
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:bg-gray-200 transition-colors"
                  />
                </div>
              </div>
              {/* Categories */}
              <div className="px-5 py-3 overflow-hidden">
                <div className="border-b border-gray-300 pb-3">
                  <div className="flex gap-2">
                    {CATEGORIES.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`text-xs px-3 py-0.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                          activeCategory === category.id
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Members List Header */}
              <div className="px-5">
                <p className="text-xs font-bold text-gray-800">
                  Trò chuyện gần đây
                </p>
              </div>
              {/* Loading */}
              {loading && (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              )}
              {/* Members List - ĐÃ ĐƯỢC CẢI TIẾN */}
              {!loading && (
                <div className="relative">
                  {/* Danh sách có scroll */}
                  <div
                    ref={listRef}
                    className="px-5 py-3 max-h-[45vh] overflow-y-auto scrollbar-hide"
                  >
                    {groupedUsers.keys.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">
                          Không tìm thấy người dùng nào
                        </p>
                      </div>
                    ) : (
                      groupedUsers.keys.map((letter) => (
                        <div
                          key={letter}
                          id={`section-${letter}`}
                          className="mb-4"
                        >
                          {/* Tiêu đề chữ cái - sticky */}
                          <div className="py-2 text-xs font-bold text-gray-800 ">
                            {letter === "#" ? "Khác" : letter}
                          </div>

                          {/* Danh sách user trong nhóm */}
                          {groupedUsers.groups.get(letter)!.map((user) => {
                            const isSelected = selectedMembers.has(user.id);

                            return (
                              <div
                                key={user.id}
                                onClick={() => toggleMember(user.id)}
                                className="flex items-center gap-3 py-2 cursor-pointer 
                                  hover:bg-blue-50 rounded-lg px-3 transition-all
                                  border border-transparent hover:border-blue-300"
                              >
                                <UserAvatar
                                  avatar={user.avatar}
                                  display_name={user.name}
                                  isOnline={user.online}
                                  size={48}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 text-sm truncate">
                                    {user.name}
                                  </p>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    isSelected
                                      ? "bg-blue-500 border-blue-500"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check size={14} className="text-white" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Thanh chữ cái dọc bên phải - ĐẸP CHUẨN APP CHAT
                  {groupedUsers.keys.length > 6 && (
                    <div
                      className="absolute right-1 top-0 bottom-0 w-8 flex flex-col justify-center items-center pointer-events-none"
                      style={{ height: "100%" }} // Đảm bảo full chiều cao scroll area
                    >
                      <div className="flex flex-col justify-between h-full py-6 pointer-events-auto">
                        {groupedUsers.keys.map((letter) => (
                          <button
                            key={letter}
                            onClick={() => scrollToLetter(letter)}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.color = "#2563eb")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.color = "#94a3b8")
                            }
                            className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors duration-200 transform hover:scale-125"
                            style={{
                              lineHeight: "1",
                              minHeight: "18px",
                            }}
                          >
                            {letter === "#" ? "⋯" : letter}
                          </button>
                        ))}
                      </div>

                      Hiệu ứng nổi bật khi hover (tùy chọn thêm)
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-blue-500 text-white text-xs font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                          <span
                            id="active-letter-indicator"
                            className="text-lg"
                          >
                            A
                          </span>
                        </div>
                      </div>
                    </div>
                  )} */}
                </div>
              )}
            </div>

            {/* Footer - giữ nguyên */}
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-300 bg-white">
              <button
                onClick={onClose}
                className="text-sm px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  submitting || !groupName.trim() || selectedMembers.size === 0
                }
                className="text-sm px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>Tạo nhóm</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
