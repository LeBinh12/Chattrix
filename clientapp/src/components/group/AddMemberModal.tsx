import { useState, useEffect, useCallback } from "react";
import { X, UserPlus, Check } from "lucide-react";
import { toast } from "react-toastify";
import { groupApi } from "../../api/group";
import { API_ENDPOINTS } from "../../config/api";
import { LOGO } from "../../assets/paths";

interface User {
  id: string;
  display_name: string;
  avatar: string;
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onAddMembers: () => void;
}

export default function AddMemberModal({
  isOpen,
  onClose,
  groupId,
  onAddMembers,
}: AddMemberModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // const [page, setPage] = useState(1);
  // const [hasMore, setHasMore] = useState(true);

  // Fetch users chưa trong nhóm

  const fetchUsers = useCallback(
    async (pageToFetch = 1) => {
      try {
        setLoading(true);
        const res = await groupApi.getNumber(groupId, pageToFetch, 50);

        if (res.status === 200) {
          const data = res.data || [];

          if (pageToFetch === 1) {
            setUsers(data);
          } else {
            setUsers((prev) => [...prev, ...data]);
          }
        }
      } catch (error) {
        console.error("Lỗi tải danh sách user:", error);
      } finally {
        setLoading(false);
      }
    },
    [groupId]
  );

  useEffect(() => {
    if (!isOpen) return;
    fetchUsers(1);
  }, [isOpen, fetchUsers]);

  // Reset khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedMembers(new Set());
    }
  }, [isOpen]);

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
    if (selectedMembers.size === 0) {
      toast.warning("Vui lòng chọn ít nhất một thành viên");
      return;
    }

    try {
      setSubmitting(true);
      for (const userId of Array.from(selectedMembers)) {
        await groupApi.addMember({
          group_id: groupId,
          user_id: userId,
          role: "member",
        });
      }

      // Lọc bỏ những user vừa thêm khỏi list hiện tại
      setUsers((prev) => prev.filter((u) => !selectedMembers.has(u.id)));
      const addedCount = selectedMembers.size;
      setSelectedMembers(new Set());

      toast.success(`Đã thêm ${addedCount} thành viên vào nhóm!`);
      onAddMembers?.();

      // Nếu không còn user nào -> thông báo / đóng modal (tuỳ bạn)
      setTimeout(() => {
        if (users.length - addedCount <= 0) {
          toast.info("Đã thêm hết tất cả người dùng trong danh sách.");
          // onClose(); // nếu muốn tự đóng modal, bỏ comment
        }
      }, 200);
    } catch (error) {
      console.error(error);
      toast.error("Thêm thành viên thất bại!");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <UserPlus size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Thêm thành viên</h2>
              <p className="text-xs text-white/90 mt-0.5">
                Chọn người chưa tham gia nhóm
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="mt-3 text-gray-500">Đang tải...</p>
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              Không tìm thấy người dùng nào
            </p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => {
                const isSelected = selectedMembers.has(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleMember(user.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <img
                      src={
                        user.avatar && user.avatar !== "null"
                          ? `${API_ENDPOINTS.UPLOAD_MEDIA}/${user.avatar}`
                          : LOGO
                      }
                      alt={user.display_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <p className="font-medium">{user.display_name}</p>
                    {isSelected && (
                      <Check className="ml-auto text-blue-500" size={16} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t">
          <button
            onClick={onClose}
            className="px-6 py-3 border rounded-2xl font-semibold text-gray-700"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              selectedMembers.size === 0 || submitting || users.length === 0
            }
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-2xl font-semibold disabled:opacity-50"
          >
            {submitting ? "Đang thêm..." : `Thêm (${selectedMembers.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
