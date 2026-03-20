import { useCallback, useEffect, useMemo, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  ChevronLeft,
  Crown,
  Shield,
  MoreVertical,
  UserMinus,
  Search,
  Users,
  Loader2,
} from "lucide-react";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { activePanelAtom } from "../../recoil/atoms/uiAtom";
import { userAtom } from "../../recoil/atoms/userAtom";
import ConfirmModal from "../notification/ConfirmModal";
import { groupMembersAtom, groupTotalMembersAtom } from "../../recoil/atoms/groupAtom";
import { groupApi } from "../../api/group";
import type { GroupMember, GroupRole } from "../../types/group-member";
import UserAvatar from "../UserAvatar";
import { BUTTON_HOVER } from "../../utils/className";
import AddMemberModal from "../group/AddMemberModal";
import { socketManager } from "../../api/socket";
import { toast } from "react-toastify";

export default function GroupMembersPanel() {
  const selectedChat = useRecoilValue(selectedChatState);
  const groupId = selectedChat?.group_id;
  const setActivePanel = useSetRecoilState(activePanelAtom);
  const activePanel = useRecoilValue(activePanelAtom);
  console.log("groupId",groupId);
  const currentUser = useRecoilValue(userAtom);

  const groupMembersMap = useRecoilValue(groupMembersAtom);
  const setGroupMembersMap = useSetRecoilState(groupMembersAtom);
  const setGroupTotalMembers = useSetRecoilState(groupTotalMembersAtom);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canRemove, setCanRemove] = useState(false);
  const [canTransfer, setCanTransfer] = useState(false);
  const [canPromote, setCanPromote] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [showMemberMenu, setShowMemberMenu] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  // Helper function to deduplicate members with role priority
  const deduplicateMembers = useCallback((members: GroupMember[]) => {
    const roleWeight = { owner: 3, admin: 2, member: 1, number: 4 };
    const emailMap = new Map<string, GroupMember>();

    members.forEach((member) => {
      if (!member.email) {
        // If no email, add with user_id as key
        emailMap.set(`no-email-${member.user_id}`, member);
        return;
      }

      const existing = emailMap.get(member.email);
      
      // If not exists or new member has higher role
      if (!existing || roleWeight[member.role] > roleWeight[existing.role]) {
        emailMap.set(member.email, member);
      }
    });

    return Array.from(emailMap.values());
  }, []);

  const loadMembers = useCallback(
    async (pageToLoad: number, isInitial = false, limit = 20) => {
      if (!groupId || loadingMore) return;

      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await groupApi.getGroupMembers(groupId, pageToLoad, limit);

        setGroupMembersMap((prev) => {
          const existingMembers = prev[groupId] || [];
          const updatedMembers = isInitial
            ? res.data.members
            : [...existingMembers, ...res.data.members];

          // Deduplicate with higher role priority
          const uniqueMembers = deduplicateMembers(updatedMembers);

          return {
            ...prev,
            [groupId]: uniqueMembers,
          };
        });

        setGroupTotalMembers((prev) => ({
          ...prev,
          [groupId]: res.data.total,
        }));

        // Update hasMore and page
        setHasMore(res.data.members.length >= limit);
        setPage(pageToLoad + 1);
      } catch (error) {
        console.error("Fetch group members error:", error);
      } finally {
        if (isInitial) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [groupId, loadingMore, setGroupMembersMap, deduplicateMembers]
  );

  // Effect when switching panel/group
  useEffect(() => {
    if (activePanel !== "members") return;
    if (!groupId) return;

    // Reset state
    setPage(1);
    setHasMore(true);
    setSearchQuery("");

    // Check cache
    const cachedMembers = groupMembersMap[groupId];
    if (cachedMembers && cachedMembers.length > 0) {
      // Log for debugging
      const ownerCount = cachedMembers.filter(m => m.role === "owner").length;
      console.log("ownerCount", ownerCount)
      return;
    }

    // Load initial data
    loadMembers(1, true);
  }, [activePanel, groupId]);

  // Effect for search
  useEffect(() => {
    if (!groupId) return;
    
    if (!searchQuery) {
      // When clearing search, reset to cache or reload
      const cachedMembers = groupMembersMap[groupId];
      if (!cachedMembers || cachedMembers.length === 0) {
        setPage(1);
        setHasMore(true);
        loadMembers(1, true);
      }
      return;
    }

    const fetchSearchResults = async () => {
      setLoading(true);
      setPage(1);
      setHasMore(true);

      try {
        const res = await groupApi.getGroupMembers(groupId, 1, 20, searchQuery);
        console.log("res.data.my_role",res.data.members.find(m => m.user_id === currentUser?.data.id))        
        // Dedup search results
        const uniqueResults = deduplicateMembers(res.data.members);
        
        setGroupMembersMap((prev) => ({
          ...prev,
          [`${groupId}-search`]: uniqueResults, // Separate search results
        }));
        
        setPage(2);
        setHasMore(res.data.members.length >= 50);
      } catch (error) {
        console.error("Search group members error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, groupId, setGroupMembersMap, deduplicateMembers]);

  // Get members from cache (NO more deduplication as it's filtered in loadMembers)
  const members = useMemo(() => {
    if (!groupId) return [];
    
    // If searching, take from search results
    if (searchQuery) {
      return groupMembersMap[`${groupId}-search`] || [];
    }
    
    // If not searching, take from normal cache
    const allMembers = groupMembersMap[groupId] || [];
    
    return allMembers;
  }, [groupId, groupMembersMap, searchQuery]);

  // Filter members based on search query (filter display_name only)
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    
    return members.filter((member) =>
      member.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [members, searchQuery]);

  // Effect to check owner/admin role based on members data
  useEffect(() => {
    if (!members || !currentUser) {
      setIsOwner(false);
      setIsAdmin(false);
      setCanRemove(false);
      setCanTransfer(false);
      setCanPromote(false);
      return;
    }

    const myMember = members.find(m => m.user_id === currentUser.data.id);
    if (myMember) {
      const role = myMember.role;
      const localIsOwner = role === "owner";
      const localIsAdmin = role === "owner" || role === "admin";
      
      setIsOwner(localIsOwner);
      setIsAdmin(localIsAdmin);

      const permissions = myMember.role_info?.permissions || [];
      const hasRemovePerm = permissions.includes("group:member:remove");
      const hasTransferPerm = permissions.includes("group:member:transfer_owner");
      const hasPromotePerm = permissions.includes("group:member:promote_admin");

      // Use local constants to avoid race condition with state updates
      setCanRemove(localIsAdmin || hasRemovePerm);
      setCanTransfer(localIsOwner || hasTransferPerm);
      setCanPromote(localIsOwner || hasPromotePerm);
    } else {
      setIsOwner(false);
      setIsAdmin(false);
      setCanRemove(false);
      setCanTransfer(false);
      setCanPromote(false);
    }
  }, [members, currentUser]);

  // No longer filtering out self, so everyone appears in the list
  const displayMembers = filteredMembers;

  // Group members by role (using displayMembers)
  const owners = useMemo(
    () => displayMembers.filter((m) => m.role === "owner"),
    [displayMembers]
  );
  const admins = useMemo(
    () => displayMembers.filter((m) => m.role === "admin"),
    [displayMembers]
  );
  const regularMembers = useMemo(
    () =>
  displayMembers.filter(
    (m) => m.role === "member" || m.role === "number"
  ),

    [displayMembers]
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
    // 1. Don't open menu for self
    if (member.user_id === currentUser?.data.id) return;

    // 2. Only Owner or Admin can open menu
    if (!isAdmin) return;

    // 3. Admin (not Owner) cannot open menu for Owner
    if (!isOwner && member.role === "owner") return;

    setSelectedMember(member);
    setShowMemberMenu(true);
  };

  const handleTransferLeadership = () => {
    if (!selectedMember) return;
    setShowMemberMenu(false);
    setShowTransferConfirm(true);
  };

  const executeTransferLeadership = async () => {
    if (!groupId || !selectedMember || !currentUser) return;

    try {
      await groupApi.transferOwner(groupId, selectedMember.user_id);

      // Update Recoil state: Self becomes member, other person becomes owner
      setGroupMembersMap((prev) => {
        const currentMembers = prev[groupId] || [];
        const updatedMembers = currentMembers.map((m) => {
          if (m.user_id === currentUser.data.id) {
            return { ...m, role: "member" as GroupRole, role_info: undefined };
          }
          if (m.user_id === selectedMember.user_id) {
            return { ...m, role: "owner" as GroupRole, role_info: undefined }; // backend will provide updated role_info on next fetch or we can let it be undefined until refreshed
          }
          return m;
        });

        return {
          ...prev,
          [groupId]: updatedMembers,
        };
      });

      toast.success(`Đã nhường quyền Trưởng nhóm cho ${selectedMember.display_name}!`);
      
      // Close panel info or refresh if needed - UI updates automatically via Recoil here
    } catch (error) {
      console.error("Failed to transfer leadership:", error);
      toast.error("Không thể nhường quyền trưởng nhóm!");
    } finally {
      setShowTransferConfirm(false);
      setSelectedMember(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!groupId || !selectedMember) return;
    
    try {
      await groupApi.removeMember(groupId, selectedMember.user_id);
      
      // Update Recoil state for immediate UI feedback
      setGroupMembersMap((prev) => {
        const currentMembers = prev[groupId] || [];
        const updatedMembers = currentMembers.filter(
          (m) => m.user_id !== selectedMember.user_id
        );
        
        return {
          ...prev,
          [groupId]: updatedMembers,
        };
      });

      setGroupTotalMembers((prev) => ({
        ...prev,
        [groupId]: Math.max(0, (prev[groupId] || 0) - 1),
      }));

      console.log("Removed member successfully:", selectedMember.display_name);
    } catch (error) {
      console.error("Failed to remove member:", error);
    } finally {
      setShowRemoveConfirm(false);
      setShowMemberMenu(false);
      setSelectedMember(null);
    }
  };

  const handlePromoteMember = async () => {
    if (!groupId || !selectedMember) return;

    try {
      await groupApi.promoteAdmin(groupId, selectedMember.user_id);

      // Update Recoil state for immediate UI feedback
      setGroupMembersMap((prev) => {
        const currentMembers = prev[groupId] || [];
        const updatedMembers = currentMembers.map((m) =>
          m.user_id === selectedMember.user_id ? { ...m, role: "admin" as GroupRole } : m
        );

        return {
          ...prev,
          [groupId]: updatedMembers,
        };
      });

      // Notify via socket for the other person to refresh page or permissions
      socketManager.sendPromoteAdmin(groupId, selectedMember.user_id);

      toast.success(`Đã chỉ định ${selectedMember.display_name} làm quản trị viên!`);
    } catch (error) {
      console.error("Failed to promote member:", error);
      toast.error("Không thể chỉ định quản trị viên!");
    } finally {
      setShowPromoteConfirm(false);
      setShowMemberMenu(false);
      setSelectedMember(null);
    }
  };

  const renderMemberItem = (member: GroupMember) => {
    // const isOnline = member.online_status === "online";
    const canClick = 
      isAdmin && 
      member.user_id !== currentUser?.data.id && 
      (isOwner || member.role !== "owner");

    return (
      <div
        key={`${member.id}-${member.email || member.user_id}`}
        onClick={() => canClick && handleMemberClick(member)}
        className={`flex items-center gap-3 px-4 py-3 transition ${
          canClick ? "hover:bg-gray-50 cursor-pointer" : ""
        }`}
      >
        <div className="flex-shrink-0">
          <UserAvatar
            avatar={member.avatar}
            display_name={member.display_name}
            showOnlineStatus={false}
            size={40}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[#2e3a59] truncate">
              {member.display_name} {member.user_id === currentUser?.data.id && "(Bạn)"}
            </p>
            {getRoleBadge(member.role)}
          </div>
        </div>

        {member.role !== "owner" && isAdmin && member.user_id !== currentUser?.data.id && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleMemberClick(member);
            }}
            className="p-1.5 hover:bg-[#e3e8f2] rounded-lg transition opacity-100"
          >
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
              className={`${BUTTON_HOVER} p-1.5 rounded-lg transition`}
            >
              <ChevronLeft size={20} />
            </button>
            <p className="text-base font-semibold">
              Thành viên ({members.length})
            </p>
          </div>        </div>

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
              className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 placeholder:text-[#7d89a8] focus:outline-none focus:ring-2 focus:ring-[#00568c] focus:bg-white"
            />
          </div>
        </div>

        {/* Members List */}
        <div
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#d4dbef] scrollbar-track-transparent"
          onScroll={(e) => {
            const target = e.currentTarget;
            if (
              target.scrollHeight - target.scrollTop <= target.clientHeight + 100 &&
              hasMore &&
              !loadingMore &&
              !loading &&
              !searchQuery
            ) {
              loadMembers(page, false);
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
                <div className="mb-2">
                  <p className="text-xs font-semibold px-4 py-1 text-[#7d89a8] bg-[#f8f9fc] sticky top-0 z-10">
                    TRƯỞNG NHÓM ({owners.length})
                  </p>
                  <div className="group">
                    {owners.map((member) => renderMemberItem(member))}
                  </div>
                </div>
              )}

              {/* Admins */}
              {admins.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-semibold px-4 py-1 text-[#7d89a8] bg-[#f8f9fc] sticky top-0 z-10">
                    QUẢN TRỊ VIÊN ({admins.length})
                  </p>
                  <div className="group">
                    {admins.map((member) => renderMemberItem(member))}
                  </div>
                </div>
              )}

              {/* Members */}
              {regularMembers.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-semibold px-4 py-1 text-[#7d89a8] bg-[#f8f9fc] sticky top-0 z-10">
                    THÀNH VIÊN ({regularMembers.length})
                  </p>
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

              {!hasMore && members.length > 0 && !searchQuery && (
                <div className="flex justify-center py-4 px-4">
                  <span className="text-xs text-[#7d89a8]">
                    Đã hiển thị tất cả thành viên
                  </span>
                </div>
              )}
            </>
          )}
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
                showOnlineStatus={false}
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

            { canPromote && (
              <button
                onClick={() => {
                  setShowMemberMenu(false);
                  setShowPromoteConfirm(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#f0f3fb] transition text-left"
              >
                <Shield size={18} className="text-[#4f6eda]" />
                <span className="text-sm text-[#2e3a59]">
                  Chỉ định làm nhóm phó
                </span>
              </button>
            )}

            {canTransfer && (
              <button
                onClick={handleTransferLeadership}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#f0f3fb] transition text-left"
              >
                <Crown size={18} className="text-yellow-600" />
                <span className="text-sm text-[#2e3a59]">
                  Nhường quyền trưởng nhóm
                </span>
              </button>
            )}

            {canRemove && (
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
            )}

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

      {/* Transfer Leadership Confirmation Modal */}
      <ConfirmModal
        isOpen={showTransferConfirm}
        title="Nhường quyền trưởng nhóm"
        description={`Khi xác nhận, ${selectedMember?.display_name} sẽ trở thành Trưởng nhóm mới. Bạn sẽ trở thành Thành viên và không thể thu hồi hành động này. Bạn có chắc chắn?`}
        confirmText="Nhường quyền"
        cancelText="Hủy"
        onConfirm={executeTransferLeadership}
        onCancel={() => {
          setShowTransferConfirm(false);
          setSelectedMember(null);
        }}
      />

      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        groupId={groupId || ""}
        onAddMembers={() => {
          // Re-load members or update cache if needed
          loadMembers(1, true);
        }}
      />
    </>
  );
}