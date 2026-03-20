import { useRecoilValue, useSetRecoilState } from "recoil";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { userAtom } from "../../recoil/atoms/userAtom";
import { useState, useMemo } from "react";
import { useChatMedia } from "../../hooks/useChatMedia";
import ChatInfoHeader from "./chat_info_panel/ChatInfoHeader";
import ActionButtons from "./chat_info_panel/ActionButtons";
import RecentMediaSection from "./chat_info_panel/RecentMediaSection";
import RecentFilesSection from "./chat_info_panel/RecentFilesSection";
import MediaViewerModal from "../MediaViewerModal";
import ButtonMembers from "./chat_info_panel/ButtonMembers";
import { groupMembersAtom, groupTotalMembersAtom } from "../../recoil/atoms/groupAtom";
import { groupApi } from "../../api/group";
import { useCallback, useEffect } from "react";
import type { GroupMember } from "../../types/group-member";

export default function ChatInfoPanel() {
  const selectedChat = useRecoilValue(selectedChatState);
  const user = useRecoilValue(userAtom);
  const groupMembersMap = useRecoilValue(groupMembersAtom);
  const setGroupMembersMap = useSetRecoilState(groupMembersAtom);
  const groupTotalMembers = useRecoilValue(groupTotalMembersAtom);
  const setGroupTotalMembers = useSetRecoilState(groupTotalMembersAtom);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const { recentMedia, recentFiles } = useChatMedia({
    selectedChat,
    userId: user?.data.id,
  });

  const deduplicateMembers = useCallback((members: GroupMember[]) => {
    const roleWeight = { owner: 3, admin: 2, member: 1, number: 4 };
    const emailMap = new Map<string, GroupMember>();

    members.forEach((member) => {
      if (!member.email) {
        emailMap.set(`no-email-${member.user_id}`, member);
        return;
      }
      const existing = emailMap.get(member.email);
      if (!existing || roleWeight[member.role] > roleWeight[existing.role]) {
        emailMap.set(member.email, member);
      }
    });

    return Array.from(emailMap.values());
  }, []);

  useEffect(() => {
    if (!selectedChat?.group_id) return;
    if (selectedChat.group_id === "000000000000000000000000") return;

    const cachedMembers = groupMembersMap[selectedChat.group_id];
    if (cachedMembers && cachedMembers.length > 0) return;

    (async () => {
      try {
        const res = await groupApi.getGroupMembers(selectedChat.group_id!, 1, 50);
        if (res.status === 200) {
          const uniqueMembers = deduplicateMembers(res.data.members);
          setGroupMembersMap((prev) => ({
            ...prev,
            [selectedChat.group_id!]: uniqueMembers,
          }));
          setGroupTotalMembers((prev) => ({
            ...prev,
            [selectedChat.group_id!]: res.data.total,
          }));
        }
      } catch (err) {
        console.error("Lỗi khi tải thành viên nhóm:", err);
      }
    })();
  }, [selectedChat?.group_id, groupMembersMap, setGroupMembersMap, deduplicateMembers]);

  const { isOwner, canAdd } = useMemo(() => {
    if (!selectedChat?.group_id || !user?.data.id) return { isOwner: false, canAdd: false };
    const members = groupMembersMap[selectedChat.group_id] || [];
    const myMember = members.find((m) => m.user_id === user.data.id);
    
    if (!myMember) return { isOwner: false, canAdd: false };

    const role = myMember.role;
    const isOwner = role === "owner";
    const isAdmin = role === "owner" || role === "admin";
    const permissions = myMember.role_info?.permissions || [];
    
    const canAdd = isAdmin || permissions.includes("group:member:add");

    return { isOwner, canAdd };
  }, [selectedChat, user, groupMembersMap]);

  const handleLeaveGroup = () => {
    console.log("Rời khỏi nhóm");
  };

  const handleDeleteHistory = () => {
    console.log("Xóa lịch sử trò chuyện");
  };

  const handleMediaClick = (mediaId: string) => {
    const index = recentMedia.findIndex((m) => m.id === mediaId);
    if (index !== -1) {
      setSelectedMediaIndex(index);
      setIsViewerOpen(true);
    }
  };

  if (!selectedChat) {
    return (
      <div className="bg-[#f5f6f7] w-full lg:w-80 h-full flex items-center justify-center border-l border-[#e1e4ea]">
        <div className="text-center px-6 space-y-3 text-[#7d89a8]">
          <div className="w-16 h-16 bg-[#eef2fb] rounded-2xl mx-auto flex items-center justify-center text-[#5a7de1]">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#5b2f39]">
            Chọn một cuộc trò chuyện
          </p>
          <p className="text-xs">Để xem thông tin chi tiết</p>
        </div>
      </div>
    );
  }

  const isGroup = !!selectedChat.group_id;

  return (
    <>
      <div
        className="bg-[#f5f6f7] w-full lg:w-[340px] h-full flex flex-col overflow-y-auto border-l border-[#dbe0e6] scrollbar-thin scrollbar-thumb-gray-300"
      >
        {/* Header Information */}
        <div className="bg-white mb-2 pb-2">
          <ChatInfoHeader
            avatar={selectedChat.avatar}
            displayName={selectedChat.display_name}
            isGroup={isGroup}
            isOwner={isOwner}
            canAdd={canAdd}
          />
        </div>

        {/* Member List Button (if group) - keeping it simple for now, maybe merge into header or a section */}
        {isGroup && (
          <div className="bg-white mb-2">
            <ButtonMembers 
              isGroup={isGroup} 
              memberCount={groupTotalMembers[selectedChat.group_id!] || (groupMembersMap[selectedChat.group_id!]?.length || 0)} 
            />
          </div>
        )}

        {/* Media Section */}
        <div className="bg-white mb-2 p-3">
          <RecentMediaSection
            mediaItems={recentMedia}
            onMediaClick={handleMediaClick}
          />
        </div>

        {/* Files Section */}
        <div className="bg-white mb-2 p-3">
          <RecentFilesSection fileItems={recentFiles} />
        </div>

        {/* Settings / Privacy Section */}
        <div className="bg-white mb-2 p-3">
          <div className="text-sm font-semibold text-gray-700 mb-2">Thiết lập bảo mật</div>
          {/* Add more settings here if needed */}
          <div className="text-xs text-gray-500 italic">Tính năng đang phát triển</div>
        </div>


        {/* Danger Zone / Actions */}
        <div className="bg-white mb-2 p-3">
          <ActionButtons
            isGroup={isGroup}
            onLeaveGroup={handleLeaveGroup}
            onDeleteHistory={handleDeleteHistory}
            userId={user?.data.id}
            groupId={selectedChat.group_id}
            isOwner={isOwner}
          />
        </div>

      </div>

      <MediaViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        mediaItems={recentMedia}
        initialIndex={selectedMediaIndex}
      />
    </>
  );
}
