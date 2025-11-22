import { useRecoilValue } from "recoil";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { userAtom } from "../../recoil/atoms/userAtom";
import { useState } from "react";
import { useChatMedia } from "../../hooks/useChatMedia";
import { motion } from "framer-motion";
import ChatInfoHeader from "./chat_info_panel/ChatInfoHeader";
import ActionButtons from "./chat_info_panel/ActionButtons";
import RecentMediaSection from "./chat_info_panel/RecentMediaSection";
import RecentFilesSection from "./chat_info_panel/RecentFilesSection";
import MediaViewerModal from "../MediaViewerModal";

export default function ChatInfoPanel() {
  const selectedChat = useRecoilValue(selectedChatState);
  const user = useRecoilValue(userAtom);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const { recentMedia, recentFiles } = useChatMedia({
    selectedChat,
    userId: user?.data.id,
  });

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
      <motion.div
        initial={{ x: 200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="bg-white w-full lg:w-80 h-full flex items-center justify-center border-l border-[#e3e8f2]"
      >
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
          <p className="text-sm font-semibold text-[#2e3a59]">
            Chọn một cuộc trò chuyện
          </p>
          <p className="text-xs">Để xem thông tin chi tiết</p>
        </div>
      </motion.div>
    );
  }

  const isGroup = !!selectedChat.group_id;

  return (
    <>
      <motion.div
        initial={{ x: 200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 70, damping: 15 }}
        className="bg-white w-full lg:w-80 h-full flex flex-col overflow-y-auto border-l border-[#e3e8f2] scrollbar-thin scrollbar-thumb-[#d4dbef]"
      >
        <div className="border-b border-[#e4e8f1]">
          <ChatInfoHeader
            avatar={selectedChat.avatar}
            displayName={selectedChat.display_name}
            status={selectedChat.status}
            isGroup={isGroup}
          />
        </div>

        <div className="flex-1 divide-y divide-[#edf0f7]">
          {isGroup && (
            <div className="p-4">
              <ActionButtons
                isGroup={isGroup}
                onLeaveGroup={handleLeaveGroup}
                onDeleteHistory={() => {}}
                userId={user?.data.id}
                groupId={selectedChat.group_id}
              />
            </div>
          )}

          <div className="p-4">
            <RecentMediaSection
              mediaItems={recentMedia}
              onMediaClick={handleMediaClick}
            />
          </div>

          <div className="p-4">
            <RecentFilesSection fileItems={recentFiles} />
          </div>

          {!isGroup && (
            <div className="p-4">
              <ActionButtons
                isGroup={false}
                onDeleteHistory={handleDeleteHistory}
              />
            </div>
          )}
        </div>
      </motion.div>

      <MediaViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        mediaItems={recentMedia}
        initialIndex={selectedMediaIndex}
      />
    </>
  );
}
