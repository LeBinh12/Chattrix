import { useRecoilValue } from "recoil";
import { selectedChatState } from "../../recoil/atoms/chatAtom";
import { userAtom } from "../../recoil/atoms/userAtom";
import { useState } from "react";
import { useChatMedia } from "../../hooks/useChatMedia";
import { motion } from "framer-motion";
import ChatInfoHeader from "./chat_info_panel/ChatInfoHeader";
import ActionButtons from "./chat_info_panel/ActionButtons";
import SearchMessages from "./chat_info_panel/SearchMessages";
import RecentMediaSection from "./chat_info_panel/RecentMediaSection";
import RecentFilesSection from "./chat_info_panel/RecentFilesSection";
import MediaViewerModal from "../MediaViewerModal";

export default function ChatInfoPanel() {
  const selectedChat = useRecoilValue(selectedChatState);
  const user = useRecoilValue(userAtom);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleMediaClick = (index: number) => {
    setSelectedMediaIndex(index);
    setIsViewerOpen(true);
  };

  if (!selectedChat) {
    return (
      <motion.div
        initial={{ x: 200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#2563eb] w-80 h-screen flex items-center justify-center shadow-2xl"
      >
        <div className="text-center px-6">
          <div className="w-16 h-16 bg-blue-700/50 backdrop-blur-sm rounded-full mx-auto mb-4 flex items-center justify-center ring-2 ring-blue-500/30">
            <svg
              className="w-8 h-8 text-blue-300"
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
          <p className="text-blue-100 text-sm font-medium">
            Chọn một cuộc trò chuyện
          </p>
          <p className="text-blue-300/60 text-xs mt-1">
            Để xem thông tin chi tiết
          </p>
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
        className="bg-[#003ea3] w-80 h-screen  flex flex-col rounded-tl-2xl rounded-tr-2xl border border-gray-400 shadow-2xl overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-900/20"
      >
        {/* Header */}
        <div className="bg-[#1150af] backdrop-blur-sm rounded-tl-2xl  border-b border-gray-500">
          <ChatInfoHeader
            avatar={selectedChat.avatar}
            displayName={selectedChat.display_name}
            status={selectedChat.status}
            isGroup={isGroup}
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1">
          {/* Action Buttons */}
          {isGroup && (
            <div className="p-4 bg-blue-900/30 backdrop-blur-sm border-b border-gray-500">
              <ActionButtons
                isGroup={isGroup}
                onLeaveGroup={handleLeaveGroup}
                onDeleteHistory={() => {}}
                userId={user?.data.id}
                groupId={selectedChat.group_id}
              />
            </div>
          )}

          {/* Search Messages */}
          <div className="p-4 bg-blue-900/30 backdrop-blur-sm border-b border-gray-500">
            <SearchMessages
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {/* Recent Media */}
          <div className="p-4 bg-blue-800/30 backdrop-blur-sm border-b border-gray-500">
            <RecentMediaSection
              mediaItems={recentMedia}
              onMediaClick={handleMediaClick}
            />
          </div>

          {/* Recent Files */}
          <div className="p-4 bg-blue-800/30 backdrop-blur-sm border-b border-gray-500">
            <RecentFilesSection fileItems={recentFiles} />
          </div>

          {/* Delete History Button */}
          {!isGroup && (
            <div className="p-4 bg-blue-900/30 backdrop-blur-sm">
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
