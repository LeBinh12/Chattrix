import { useEffect, useMemo, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  ChevronLeft,
  Crown,
  Shield,
  MoreVertical,
  UserMinus,
  UserPlus,
  Search,
  Users,
  Loader2,
} from "lucide-react";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { activePanelAtom } from "../../recoil/atoms/uiAtom";
import { userAtom } from "../../recoil/atoms/userAtom";
import ConfirmModal from "../notification/ConfirmModal";
import { groupMembersAtom } from "../../recoil/atoms/groupAtom";
import { groupApi } from "../../api/group";
import type { GroupMember } from "../../types/group-member";
import UserAvatar from "../UserAvatar";

export default function GroupMembersPanel() {
  const selectedChat = useRecoilValue(selectedChatState);
  const groupId = selectedChat?.group_id;
  const setActivePanel = useSetRecoilState(activePanelAtom);
  const activePanel = useRecoilValue(activePanelAtom);

  const currentUser = useRecoilValue(userAtom);

  const groupMembersMap = useRecoilValue(groupMembersAtom);
  const setGroupMembersMap = useSetRecoilState(groupMembersAtom);
  const [loading, setLoading] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(
    null
  );
  const [showMemberMenu, setShowMemberMenu] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);

  const loadMembers = async (isInitial = false, limit = 20) => {
    if (!groupId || loadingMore || !hasMore) return;

    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await groupApi.getGroupMembers(groupId, page, limit);

      setGroupMembersMap((prev) => {
        const existingMembers = prev[groupId] || [];
        const updatedMembers = isInitial
          ? res.data.members
          : [...existingMembers, ...res.data.members];

        // Loại bỏ trùng email ngay trước khi lưu vào cache
        const seenEmails = new Set<string>();
        const uniqueMembers = updatedMembers.filter((member) => {
          if (!member.email) return true; // giữ nếu không có email
          if (seenEmails.has(member.email)) return false; // bỏ nếu trùng
          seenEmails.add(member.email);
          return true;
        });

        setHasMore(uniqueMembers.length < res.data.total);

        return {
          ...prev,
          [groupId]: uniqueMembers,
        };
      });

      setPage((prev) => prev + 1);
    } catch (error) {
      console.error("Fetch group members error:", error);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

useEffect(() => {
  if (activePanel !== "members") return;
  if (!groupId) return;

  setPage(1);
  setHasMore(true);

  // Kiểm tra cache trước
  const cachedMembers = groupMembersMap[groupId];
  if (cachedMembers && cachedMembers.length > 0) {
    console.log("Lấy members từ cache");
    return; // không gọi API nếu đã có cache
  }

  // Nếu không có cache thì gọi API
  loadMembers(true);
}, [activePanel, groupId]);



  useEffect(() => {
    if (!groupId) return;
    if (!searchQuery) return;

    const fetchSearchResults = async () => {
      setLoading(true);
      setPage(1);
      setHasMore(true);

      try {
        const res = await groupApi.getGroupMembers(groupId, 1, 20, searchQuery);
        setGroupMembersMap((prev) => ({
          ...prev,
          [groupId]: res.data.members,
        }));
        setPage(2);
        setHasMore(res.data.members.length < res.data.total);
      } catch (error) {
        console.error("Search group members error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchQuery]);

  // Lấy members từ cache
  // Lấy members từ cache và loại bỏ trùng email
  const members = useMemo(() => {
    if (!groupId) return [];
    const allMembers = groupMembersMap[groupId] || [];

    const seenEmails = new Set<string>();
    const uniqueMembers = allMembers.filter((member) => {
      if (!member.email) return true; // nếu không có email thì giữ
      if (seenEmails.has(member.email)) return false; // đã xuất hiện => bỏ
      seenEmails.add(member.email);
      return true;
    });

    return uniqueMembers;
  }, [groupId, groupMembersMap]);

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    return members.filter((member) =>
      member.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [members, searchQuery]);

  // Group members by role
  const owners = useMemo(
    () => filteredMembers.filter((m) => m.role === "owner"),
    [filteredMembers]
  );
  const admins = useMemo(
    () => filteredMembers.filter((m) => m.role === "admin"),
    [filteredMembers]
  );
  const regularMembers = useMemo(
    () => filteredMembers.filter((m) => m.role === "member"),
    [filteredMembers]
  );

  const getRoleBadge = (role: GroupMember["role"]) => {
    switch (role) {
      case "owner":
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200">
            <Crown size={12} className="text-yellow-600" />
            <span className="text-[10px] font-medium text-yellow-700">
              Trưởng nhóm
            </span>
          </div>
        );
      case "admin":
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <Shield size={12} className="text-blue-600" />
            <span className="text-[10px] font-medium text-blue-700">
              Quản trị viên
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const handleMemberClick = (member: GroupMember) => {
    // Only show menu if current user is admin/owner and target is not owner
    const currentUserMember = members.find(
      (m) => m.user_id === currentUser?.data.id
    );
    const isCurrentUserAdmin =
      currentUserMember?.role === "owner" ||
      currentUserMember?.role === "admin";

    if (isCurrentUserAdmin && member.role !== "owner") {
      setSelectedMember(member);
      setShowMemberMenu(true);
    }
  };

  const handleRemoveMember = () => {
    console.log("Removing member:", selectedMember);
    // TODO: Call API to remove member
    // await groupApi.removeMember(groupId, selectedMember.id);
    setShowRemoveConfirm(false);
    setShowMemberMenu(false);
    setSelectedMember(null);
  };

  const handlePromoteMember = () => {
    console.log("Promoting member:", selectedMember);
    // TODO: Call API to promote member
    // await groupApi.promoteMember(groupId, selectedMember.id);
    setShowPromoteConfirm(false);
    setShowMemberMenu(false);
    setSelectedMember(null);
  };

  const renderMemberItem = (member: GroupMember) => {
    const isOnline = member.online_status === "online";

    console.log("filteredMembers",filteredMembers)
    return (
      <div
        key={member.id}
        onClick={() => handleMemberClick(member)}
        className={`flex items-center gap-3 px-4 py-3 transition ${
          member.role !== "owner" ? "hover:bg-[#f0f3fb] cursor-pointer" : ""
        }`}
      >
        <div className="flex-shrink-0">
          <UserAvatar
            avatar={member.avatar}
            display_name={member.display_name}
            isOnline={isOnline}
            size={40}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[#2e3a59] truncate">
              {member.display_name}
            </p>
            {getRoleBadge(member.role)}
          </div>
          <p className="text-xs text-[#7d89a8] mt-0.5">
            {isOnline ? "Đang hoạt động" : "Không hoạt động"}
          </p>
        </div>

        {member.role !== "owner" && (
          <button className="p-1.5 hover:bg-[#e3e8f2] rounded-lg transition opacity-0 group-hover:opacity-100">
            <MoreVertical size={16} className="text-[#7d89a8]" />
          </button>
        )}
      </div>
    );
  };

  if (!selectedChat) {
    return (
      <div className="bg-white w-full lg:w-80 h-full flex items-center justify-center">
        <div className="text-center px-6 space-y-3 text-[#7d89a8]">
          <Users size={48} className="mx-auto text-[#d4dbef]" />
          <p className="text-sm">Chọn một nhóm để xem danh sách thành viên</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white w-full lg:w-80 h-full flex items-center justify-center">
        <span className="text-sm text-[#7d89a8]">
          Đang tải danh sách thành viên...
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white w-full lg:w-80 h-full flex flex-col text-[#2e3a59]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e3e8f2]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActivePanel("info")}
              className="hover:bg-[#f0f3fb] p-1.5 rounded-lg transition"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-base font-semibold">
              Thành viên ({members.length})
            </h2>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-[#e3e8f2]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d89a8]"
            />
            <input
              type="text"
              placeholder="Tìm kiếm thành viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#f8f9fc] border border-[#e3e8f2] rounded-lg text-sm text-[#2e3a59] placeholder:text-[#7d89a8] focus:outline-none focus:ring-2 focus:ring-[#4f6eda] focus:border-transparent"
            />
          </div>
        </div>

        {/* Members List */}
        <div
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#d4dbef] scrollbar-track-transparent"
          onScroll={(e) => {
            const target = e.currentTarget;
            if (
              target.scrollHeight - target.scrollTop <=
                target.clientHeight + 100 &&
              hasMore &&
              !loadingMore
            ) {
              loadMembers(false); // false = load thêm
            }
          }}
        >
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Users size={48} className="text-[#d4dbef] mb-3" />
              <p className="text-sm text-[#7d89a8] text-center">
                {searchQuery
                  ? "Không tìm thấy thành viên"
                  : "Nhóm chưa có thành viên"}
              </p>
            </div>
          ) : (
            <>
              {/* Owners */}
              {owners.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold px-4 py-2 text-[#7d89a8] bg-[#f8f9fc] sticky top-0 z-10">
                    TRƯỞNG NHÓM
                  </h3>
                  <div className="group">
                    {owners.map((member) => renderMemberItem(member))}
                  </div>
                </div>
              )}

              {/* Admins */}
              {admins.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold px-4 py-2 text-[#7d89a8] bg-[#f8f9fc] sticky top-0 z-10">
                    QUẢN TRỊ VIÊN ({admins.length})
                  </h3>
                  <div className="group">
                    {admins.map((member) => renderMemberItem(member))}
                  </div>
                </div>
              )}

              {/* Members */}
              {regularMembers.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold px-4 py-2 text-[#7d89a8] bg-[#f8f9fc] sticky top-0 z-10">
                    THÀNH VIÊN ({regularMembers.length})
                  </h3>
                  <div className="group">
                    {regularMembers.map((member) => renderMemberItem(member))}
                  </div>
                </div>
              )}

              {loadingMore && (
                <div className="flex justify-center items-center py-4 px-4">
                  <Loader2 size={20} className="text-[#4f6eda] animate-spin" />
                  <span className="text-sm text-[#7d89a8] ml-2">
                    Đang tải thêm...
                  </span>
                </div>
              )}

              {/* End of List */}
              {!hasMore && members.length > 0 && (
                <div className="flex justify-center py-4 px-4">
                  <span className="text-xs text-[#7d89a8]">
                    Đã hiển thị tất cả thành viên
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Member Button */}
        <div className="px-4 py-3 border-t border-[#e3e8f2]">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#4f6eda] text-white text-sm font-medium hover:bg-[#3d5bc9] transition">
            <UserPlus size={16} />
            <span>Thêm thành viên</span>
          </button>
        </div>
      </div>

      {/* Member Action Menu Modal */}
      {showMemberMenu && selectedMember && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center"
          onClick={() => {
            setShowMemberMenu(false);
            setSelectedMember(null);
          }}
        >
          <div
            className="bg-white rounded-t-2xl lg:rounded-2xl w-full lg:w-96 p-4 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-3 py-2 mb-3">
              <UserAvatar
                avatar={selectedMember.avatar}
                display_name={selectedMember.display_name}
                isOnline={selectedMember.online_status === "online"}
                size={48}
              />
              <div>
                <p className="text-sm font-semibold text-[#2e3a59]">
                  {selectedMember.display_name}
                </p>
                <p className="text-xs text-[#7d89a8]">
                  {selectedMember.role === "admin"
                    ? "Quản trị viên"
                    : "Thành viên"}
                </p>
              </div>
            </div>

            {selectedMember.role === "member" && (
              <button
                onClick={() => {
                  setShowMemberMenu(false);
                  setShowPromoteConfirm(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#f0f3fb] transition text-left"
              >
                <Shield size={18} className="text-[#4f6eda]" />
                <span className="text-sm text-[#2e3a59]">
                  Chỉ định làm quản trị viên
                </span>
              </button>
            )}

            <button
              onClick={() => {
                setShowMemberMenu(false);
                setShowRemoveConfirm(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#fff5f6] transition text-left"
            >
              <UserMinus size={18} className="text-[#d93434]" />
              <span className="text-sm text-[#d93434]">Xóa khỏi nhóm</span>
            </button>

            <button
              onClick={() => {
                setShowMemberMenu(false);
                setSelectedMember(null);
              }}
              className="w-full py-3 rounded-lg border border-[#e3e8f2] text-sm text-[#7d89a8] hover:bg-[#f8f9fc] transition mt-2"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      <ConfirmModal
        isOpen={showRemoveConfirm}
        title="Xóa thành viên"
        description={`Bạn có chắc muốn xóa ${selectedMember?.display_name} khỏi nhóm?`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={handleRemoveMember}
        onCancel={() => {
          setShowRemoveConfirm(false);
          setSelectedMember(null);
        }}
      />

      {/* Promote Member Confirmation Modal */}
      <ConfirmModal
        isOpen={showPromoteConfirm}
        title="Chỉ định quản trị viên"
        description={`Bạn có chắc muốn chỉ định ${selectedMember?.display_name} làm quản trị viên?`}
        confirmText="Xác nhận"
        cancelText="Hủy"
        onConfirm={handlePromoteMember}
        onCancel={() => {
          setShowPromoteConfirm(false);
          setSelectedMember(null);
        }}
      />
    </>
  );
}
