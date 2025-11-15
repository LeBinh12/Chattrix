import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Camera,
  Check,
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { conversationApi } from "../../api/conversation";
import { toast } from "react-toastify";
import { groupApi } from "../../api/group";
import { API_ENDPOINTS } from "../../config/api";

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
  onCreateGroup: () => void;
}

type WizardStep = 1 | 2 | 3;

export default function CreateGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
}: CreateGroupModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
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

  // Fetch users for step 2
  useEffect(() => {
    if (!isOpen || currentStep !== 2) return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await conversationApi.getConversation(1, 50, searchQuery);
        if (res.status === 200) {
          const mappedUsers: User[] = res.data.data
            .filter((item) => !!item.user_id)
            .map((item) => ({
              id: item.user_id,
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
  }, [isOpen, currentStep, searchQuery]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setGroupName("");
      setGroupImage("");
      setImagePreview("");
      setSearchQuery("");
      setSelectedMembers(new Set());
      setTempQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleSubmit = async () => {
    if (!groupName.trim() || selectedMembers.size === 0) return;

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
        const groupId = res.data || res.data;
        const memberIds = Array.from(selectedMembers);

        for (const userId of memberIds) {
          await groupApi.addMember({
            group_id: groupId,
            user_id: userId,
            role: "member",
          });
        }

        toast.success("Tạo nhóm thành công!");
        onCreateGroup?.();
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

  const canProceedStep1 = groupName.trim().length > 0;
  const canProceedStep2 = selectedMembers.size > 0;

  const selectedUsers = users.filter((u) => selectedMembers.has(u.id));

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300 ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl transition-all duration-500 overflow-hidden ${
          isOpen
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-8"
        } rounded-[28px]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600  flex items-center justify-center shadow-md">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Tạo nhóm mới</h2>
                <p className="text-xs text-white/90 mt-0.5">
                  Bước {currentStep} / 3
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  step <= currentStep ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Group Info */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Thông tin nhóm
                </h3>
                <p className="text-gray-500">
                  Chọn ảnh đại diện và đặt tên cho nhóm của bạn
                </p>
              </div>

              {/* Group Image */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[24px] bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Group"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative">
                        <Camera size={48} className="text-white" />
                        <Sparkles
                          size={20}
                          className="absolute -top-2 -right-2 text-yellow-300 animate-pulse"
                        />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-3 -right-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-3 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-110">
                    <Camera size={20} className="text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500">
                  {imagePreview
                    ? "Nhấp để thay đổi ảnh"
                    : "Nhấp để thêm ảnh nhóm"}
                </p>
              </div>

              {/* Group Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên nhóm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="VD: Nhóm học tập, Team dự án..."
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all duration-200 bg-white text-lg"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Select Members */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Thêm thành viên
                </h3>
                <p className="text-gray-500">
                  Tìm kiếm và chọn người bạn muốn thêm vào nhóm
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={tempQuery}
                  onChange={(e) => setTempQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Tìm kiếm người dùng... (Nhấn Enter)"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all duration-200 bg-white"
                />
              </div>

              {/* Selected Count */}
              {selectedMembers.size > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Check size={16} className="text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      Đã chọn{" "}
                      <span className="font-bold text-purple-600">
                        {selectedMembers.size}
                      </span>{" "}
                      thành viên
                    </p>
                  </div>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block w-10 h-10 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-500 mt-3">Đang tải...</p>
                </div>
              )}

              {/* Members List */}
              {!loading && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {users.map((user, index) => {
                    const isSelected = selectedMembers.has(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleMember(user.id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-300 animate-fade-in ${
                          isSelected
                            ? "bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-indigo-400 shadow-md scale-[1.02]"
                            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:shadow-sm"
                        }`}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="relative">
                          <img
                            src={
                              user.avatar && user.avatar !== "null"
                                ? `${API_ENDPOINTS.UPLOAD_MEDIA}/${user.avatar}`
                                : "/assets/logo.png"
                            }
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md"
                          />
                          {user.online && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.online ? "Đang hoạt động" : "Không hoạt động"}
                          </p>
                        </div>
                        <div
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            isSelected
                              ? " bg-gradient-to-br from-blue-500 to-indigo-600 scale-105"
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
              )}

              {!loading && users.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Search size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">
                    Không tìm thấy người dùng nào
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Xác nhận thông tin
                </h3>
                <p className="text-gray-500">
                  Kiểm tra lại thông tin trước khi tạo nhóm
                </p>
              </div>

              {/* Group Info Review */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Users size={18} className="text-indigo-600" />
                  Thông tin nhóm
                </h4>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Group"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Camera size={32} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tên nhóm</p>
                    <p className="text-lg font-bold text-gray-800">
                      {groupName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Members Review */}
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Users size={18} className="text-indigo-600" />
                  Thành viên ({selectedMembers.size})
                </h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <img
                        src={
                          user.avatar && user.avatar !== "null"
                            ? `${API_ENDPOINTS.UPLOAD_MEDIA}/${user.avatar}`
                            : "/assets/logo.png"
                        }
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 text-sm">
                          {user.name}
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t bg-white">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep((prev) => (prev - 1) as WizardStep)}
              className="px-6 py-3 border-2 border-gray-200 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold text-gray-700 flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Quay lại
            </button>
          )}

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep((prev) => (prev + 1) as WizardStep)}
              disabled={
                (currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2)
              }
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 text-white rounded-2xl hover:shadow-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Tiếp tục
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:shadow-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{submitting ? "Đang tạo..." : "Tạo nhóm"}</span>
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #818cf8, #a78bfa);
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #6366f1, #9333ea);
        }
      `}</style>
    </div>
  );
}
