import { LogOut, Trash2 } from "lucide-react";
import ConfirmModal from "../../notification/ConfirmModal";
import { useState } from "react";
import { socketManager } from "../../../api/socket";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userAtom } from "../../../recoil/atoms/userAtom";
import { groupListState } from "../../../recoil/atoms/groupAtom";
import { groupApi } from "../../../api/group";
import UserSelectionModal, { type User } from "../../group/UserSelectionModal";
import type { GroupMember } from "../../../types/group-member";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { selectedChatState } from "../../../recoil/atoms/chatAtom";
import { activePanelAtom } from "../../../recoil/atoms/uiAtom";

interface ActionButtonsProps {
  isGroup: boolean;
  onLeaveGroup?: () => void;
  onDeleteHistory?: () => void;
  userId?: string;
  groupId?: string;
  isOwner?: boolean;
}

export default function ActionButtons({
  isGroup,
  onLeaveGroup,
  onDeleteHistory,
  userId,
  groupId,
  isOwner = false,
}: ActionButtonsProps) {
  const setGroups = useSetRecoilState(groupListState);
  const user = useRecoilValue(userAtom);
  const setSelectedChat = useSetRecoilState(selectedChatState);
  const setActivePanel = useSetRecoilState(activePanelAtom);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDissolveConfirm, setShowDissolveConfirm] = useState(false);
  const [showLeaveSelection, setShowLeaveSelection] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [dissolveLoading, setDissolveLoading] = useState(false);

  // Successor selection states
  const [members, setMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchMembers = async (pageToFetch: number, isInitial = false) => {
    if (!groupId || !userId) return;

    try {
      if (isInitial) setLoadingMembers(true);
      else setLoadingMore(true);

      const res = await groupApi.getGroupMembers(groupId, pageToFetch, PAGE_SIZE);
      if (res.status === 200) {
        const mappedMembers = res.data.members
          .filter((m: GroupMember) => m.user_id !== userId)
          .map((m: GroupMember) => ({
            id: m.user_id,
            display_name: m.display_name,
            avatar: m.avatar || "",
            online: m.online_status === "online"
          }));

        setMembers(prev => isInitial ? mappedMembers : [...prev, ...mappedMembers]);
        setHasMore(res.data.members.length === PAGE_SIZE);
        setPage(pageToFetch);
      }
    } catch (err) {
      console.error("Failed to fetch group members:", err);
      toast.error("Không thể tải danh sách thành viên");
    } finally {
      setLoadingMembers(false);
      setLoadingMore(false);
    }
  };

  const handleLeaveGroup = async (newOwnerId?: string) => {
    if (!groupId || !userId) return;

    try {
      setLeaveLoading(true);

      // 1. If owner, transfer leadership first
      if (isOwner && newOwnerId) {
        await groupApi.transferOwner(groupId, newOwnerId);
      }

      // 2. Remove self from group
      await groupApi.removeMember(groupId, userId);

      // 3. Notify via socket
      if (socketManager.getSocket()) {
        socketManager.sendMemberLeft(
          userId,
          groupId,
          user?.data.display_name,
        );
      }

      // 4. Update group list and UI
      const res = await groupApi.getGroup();
      setGroups(res.data);
      
      toast.success("Rời nhóm thành công!");
      setSelectedChat(null);
      setActivePanel("none");
      onLeaveGroup?.();
    } catch (err) {
      console.error("Failed to leave group:", err);
      toast.error("Không thể rời khỏi nhóm!");
    } finally {
      setLeaveLoading(false);
      setShowLeaveConfirm(false);
      setShowLeaveSelection(false);
    }
  };

  const handleDissolveGroup = async () => {
    if (!groupId) return;

    try {
      setDissolveLoading(true);
      await groupApi.dissolveGroup(groupId);
      
      // Note: We don't necessarily need to toast here if the socket listener 
      // will handle the navigation and notification globally for all members.
      // But for the person who did the action, a fast feedback is good.
      toast.success("Giải tán nhóm thành công!");
      
      // Update local state if needed (though socket might handle it)
      const res = await groupApi.getGroup();
      setGroups(res.data);
      
      setSelectedChat(null);
      setActivePanel("none");
    } catch (err) {
      console.error("Failed to dissolve group:", err);
      toast.error("Không thể giải tán nhóm!");
    } finally {
      setDissolveLoading(false);
      setShowDissolveConfirm(false);
    }
  };

  const handleLeaveGroupClick = () => {
    if (isOwner) {
      setShowLeaveSelection(true);
      fetchMembers(1, true);
    } else {
      setShowLeaveConfirm(true);
    }
  };

  return (
    <>
      {/* Action List */}
      <div className="flex flex-col">
        {/* Leave group */}
        {isGroup && (
          <button
            onClick={handleLeaveGroupClick}
            disabled={leaveLoading}
            className="w-full flex items-center gap-3 py-3 px-2 rounded-lg text-red-600 hover:bg-gray-100 transition-colors text-left group disabled:opacity-50"
          >
            {leaveLoading ? (
              <Loader2 size={20} className="text-red-600 animate-spin" />
            ) : (
              <LogOut size={20} className="text-red-600 group-hover:text-red-700" />
            )}
            <span className="text-sm font-medium">Rời khỏi nhóm</span>
          </button>
        )}

        {/* Dissolve group (Owner only) */}
        {isGroup && isOwner && (
          <button
            onClick={() => setShowDissolveConfirm(true)}
            disabled={dissolveLoading}
            className="w-full flex items-center gap-3 py-3 px-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-left group disabled:opacity-50"
          >
            {dissolveLoading ? (
              <Loader2 size={20} className="text-red-600 animate-spin" />
            ) : (
              <Trash2 size={20} className="text-red-600 group-hover:text-red-700" />
            )}
            <span className="text-sm font-medium">Giải tán nhóm</span>
          </button>
        )}

        {/* Delete history placeholder (kept for structure) */}
      </div>
      {/* Delete chat history confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Xóa lịch sử trò chuyện"
        description="Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={() => {
          onDeleteHistory?.();
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Leave group confirmation modal */}
      <ConfirmModal
        isOpen={showLeaveConfirm}
        title="Rời khỏi nhóm"
        description="Bạn có chắc muốn rời khỏi nhóm này?"
        confirmText="Rời nhóm"
        cancelText="Hủy"
        onConfirm={() => handleLeaveGroup()}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* Dissolve group confirmation modal */}
      <ConfirmModal
        isOpen={showDissolveConfirm}
        title="Giải tán nhóm"
        description="Bạn có chắc muốn giải tán nhóm này? Toàn bộ thành viên sẽ bị xóa khỏi nhóm và lịch sử trò chuyện sẽ không còn truy cập được. Hành động này không thể hoàn tác."
        confirmText="Giải tán"
        cancelText="Hủy"
        onConfirm={handleDissolveGroup}
        onCancel={() => setShowDissolveConfirm(false)}
      />

      {/* Leadership Transfer & Leave for Owner */}
      <UserSelectionModal
        isOpen={showLeaveSelection}
        onClose={() => setShowLeaveSelection(false)}
        title="Nhường quyền và rời khỏi nhóm"
        submitText="Xác nhận rời nhóm"
        loadingText="Đang xử lý..."
        users={members}
        loading={loadingMembers}
        onSubmit={async (selectedIds) => {
          if (selectedIds.length > 0) {
            await handleLeaveGroup(selectedIds[0]);
          }
        }}
        emptyListMessage="Không có thành viên khác để nhường quyền"
        listTitle="Chọn người nhường quyền trưởng nhóm"
        onLoadMore={() => fetchMembers(page + 1)}
        hasMore={hasMore}
        loadingMore={loadingMore}
        singleSelection={true}
      />
    </>
  );
}
