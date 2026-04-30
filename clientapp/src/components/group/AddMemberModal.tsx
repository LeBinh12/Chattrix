import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { groupApi } from "../../api/group";
import { useRecoilValue } from "recoil";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { socketManager } from "../../api/socket";
import { userAtom } from "../../recoil/atoms/userAtom";
import UserSelectionModal, { type User } from "./UserSelectionModal";

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
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const selectedChat = useRecoilValue(selectedChatState);
  const userRecoil = useRecoilValue(userAtom);

  const fetchUsers = useCallback(
    async (pageToFetch = 1) => {
      try {
        if (pageToFetch === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const res = await groupApi.getNumber(groupId, pageToFetch, 50);

        if (res.status === 200) {
          const data = res.data || [];
          interface ApiUser {
            id: string;
            display_name: string;
            avatar: string;
            status: string;
          }
          const mappedUsers: User[] = (data as unknown as ApiUser[]).map((user) => ({
            id: user.id,
            display_name: user.display_name,
            avatar: user.avatar || "",
            online: user.status === "online",
          }));

          if (pageToFetch === 1) {
            setUsers(mappedUsers);
          } else {
            setUsers((prev) => [...prev, ...mappedUsers]);
          }

          setHasMore(mappedUsers.length === 50);
          setPage(pageToFetch);
        }
      } catch (error) {
        console.error("Error loading user list:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [groupId]
  );

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      fetchUsers(page + 1);
    }
  }, [fetchUsers, loading, loadingMore, hasMore, page]);

  useEffect(() => {
    setUsers([]);
    setPage(1);
    setHasMore(true);
  }, [groupId]);

  useEffect(() => {
    if (!isOpen) return;
    if (users.length === 0) {
      fetchUsers(1);
    }
  }, [isOpen, fetchUsers, users.length]);

  const handleSubmit = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một thành viên");
      throw new Error("No members selected");
    }

    const members = selectedIds.map((userId) => {
      const user = users.find((u) => u.id === userId);
      return {
        user_id: userId,
        user_name: user?.display_name || "",
        display_name: user?.display_name || "",
        role: "number",
      };
    });

    try {
      // Step 1: Add each member via REST API to ensure they are saved to DB/reactivated first
      const addMemberPromises = selectedIds.map((userId) =>
        groupApi.addMember({
          group_id: selectedChat?.group_id ?? "",
          user_id: userId,
          role: "number",
        })
      );

      await Promise.all(addMemberPromises);

      // Step 2: After DB is successfully updated, send socket event for real-time updates to other clients
      socketManager.sendAddGroupMember(
        userRecoil?.data.id ?? "",
        userRecoil?.data.display_name ?? "",
        selectedChat?.group_id ?? "",
        selectedChat?.display_name ?? "",
        selectedChat?.avatar ?? "",
        members,
        "add_member"
      );

      setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id)));
      toast.success(`Đã thêm ${selectedIds.length} thành viên vào nhóm!`);
      onAddMembers?.();
    } catch (error) {
      console.error("Error adding members:", error);
      toast.error("Đã xảy ra lỗi khi thêm thành viên!");
    }
  };

  return (
    <UserSelectionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm thành viên"
      submitText="Thêm"
      loadingText="Đang thêm..."
      users={users}
      loading={loading}
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onSubmit={handleSubmit}
      emptySearchMessage="Không tìm thấy kết quả phù hợp"
      emptyListMessage="Không có người dùng nào chưa trong nhóm"
      listTitle="Người chưa tham gia nhóm"
      showCategories={true}
      minSelection={1}
    />
  );
}