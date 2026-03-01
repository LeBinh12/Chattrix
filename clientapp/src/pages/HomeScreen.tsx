import { useEffect, useRef, useState } from "react";
import { useRecoilValue, useRecoilState } from "recoil";
import { userAtom, isAuthLoadingAtom } from "../recoil/atoms/userAtom";
import { selectedChatState } from "../recoil/atoms/chatAtom";
import { activePanelAtom } from "../recoil/atoms/uiAtom";
import ChannelList from "../components/home/ChannelList";
import ChannelListWrapper from "../components/home/ChannelListWrapper";
import ChatWindow from "../components/home/ChatWindow";
import ChatInfoPanel from "../components/home/ChatInfoPanel";
import ChatSearchModal from "../components/home/ChatSearchModal";
import { AnimatePresence, motion } from "framer-motion";
import StorageArchivePanel from "../components/home/StorageArchivePanel";
import GroupMembersPanel from "../components/home/GroupMembersPanel";
import ThreadPanel from "../components/home/ThreadPanel";
import { useSearchParams, Navigate } from "react-router-dom";
import { conversationListAtom } from "../recoil/atoms/conversationListAtom";

export default function HomeScreen() {
  const user = useRecoilValue(userAtom);
  const [selectedChat, setSelectedChat] = useRecoilState(selectedChatState);
  const [activePanel] = useRecoilState(activePanelAtom);
  const [isCompact, setIsCompact] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const conversationList = useRecoilValue(conversationListAtom);
  const isManualClearRef = useRef(false);
  const isAuthLoading = useRecoilValue(isAuthLoadingAtom);

  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setViewportWidth(width);
      setIsCompact(width < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync selectedChat -> URL
  // Sync selectedChat <-> URL (hai chiều đầy đủ)
  useEffect(() => {
    if (selectedChat) {
      const id = selectedChat.group_id || selectedChat.user_id || "";
      const isGroup = !!selectedChat.group_id;

      if (id) {
        const currentId = searchParams.get("id");
        const currentIsGroup = searchParams.get("isGroup");

        if (currentId !== id || currentIsGroup !== String(isGroup)) {
          setSearchParams({ id, isGroup: String(isGroup) });
        }
      }
    } else {
      // ✅ CHIẾN LƯỢC: Chỉ xóa query params nếu:
      // 1. Không có chat nào được chọn
      // 2. VÀ (Người dùng chủ động xóa HOẶC Danh sách chat đã load xong mà không tìm thấy ID nào khớp)
      const idInUrl = searchParams.get("id");
      if (idInUrl) {
        if (isManualClearRef.current) {
          setSearchParams({});
        } else if (conversationList.length > 0) {
          // Nếu list đã load mà vẫn không có selectedChat -> có thể ID trong URL không hợp lệ
          // Nhưng ta nên đợi một chút hoặc check xem có found trong list không
          const isGroup = searchParams.get("isGroup") === "true";
          const existsInList = conversationList.some(
            (c) => (isGroup && c.group_id === idInUrl) || (!isGroup && c.user_id === idInUrl)
          );
          
          if (!existsInList) {
            setSearchParams({});
          }
        }
      }
    }
  }, [selectedChat, searchParams, setSearchParams, conversationList]);

  // Restore URL -> selectedChat (when list loads)
  useEffect(() => {
    const id = searchParams.get("id");
    const isGroup = searchParams.get("isGroup") === "true";

    if (isManualClearRef.current) return;

    if (id && !selectedChat && conversationList.length > 0) {
      const found = conversationList.find(
        (c) => (isGroup && c.group_id === id) || (!isGroup && c.user_id === id)
      );

      if (found) {
        setSelectedChat({
          user_id: isGroup ? "" : found.user_id,
          group_id: isGroup ? found.group_id : "",
          avatar: found.avatar,
          display_name: found.display_name,
          status: found.status,
          update_at: found.updated_at,
        });
      }
    }
  }, [searchParams, conversationList, selectedChat, setSelectedChat]);

  
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#e9edf5]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00568c] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#00568c] font-medium animate-pulse">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const compactListWidth = Math.min(Math.max(viewportWidth - 80, 240), 360);

  return (
    <div className="flex flex-1 h-full min-w-0 bg-[#e9edf5] overflow-hidden">
      {isCompact ? (
        <div className="flex-1 flex relative overflow-hidden">
          <div className={`flex-1 flex bg-white overflow-hidden z-0 ${(!selectedChat && activePanel === "none") ? "" : "hidden"}`}>
            <div className="flex-1 overflow-y-auto border-l border-[#dbe2ef] ">
              <ChannelList width={compactListWidth} />
            </div>
          </div>

          <div className={`flex-1 flex bg-[#f5f6fb] border-l border-[#dbe2ef] overflow-hidden z-1 ${selectedChat ? "" : "hidden"}`}>
            <ChatWindow
              onBack={() => {
                isManualClearRef.current = true; // ✅ Đánh dấu đang clear thủ công
                setSelectedChat(null);
                setSearchParams({});

                // Reset flag sau một chút
                setTimeout(() => {
                  isManualClearRef.current = false;
                }, 100);
              }}
            />
          </div>


              <AnimatePresence>
                {activePanel === "info" && (
                  <motion.div
                    key="mobile-panel-info"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      mass: 0.8,
                    }}
                    className="absolute inset-0 bg-white overflow-y-auto z-50 shadow-2xl"
                  >
                    <ChatInfoPanel />
                  </motion.div>
                )}
                {activePanel === "search" && (
                  <motion.div
                    key="chat-search-modal"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      mass: 0.8,
                    }}
                    className="absolute inset-0 bg-white overflow-y-auto z-50 shadow-2xl"
                  >
                    <ChatSearchModal />
                  </motion.div>
                )}
                {activePanel === "members" && (
                  <motion.div
                    key="mobile-panel-members"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      mass: 0.8,
                    }}
                    className="absolute inset-0 bg-white overflow-y-auto z-50 shadow-2xl"
                  >
                    <GroupMembersPanel />
                  </motion.div>
                )}
                {activePanel === "storage" && (
                  <motion.div
                    key="mobile-panel-storage"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      mass: 0.8,
                    }}
                    className="absolute inset-0 bg-white overflow-y-auto z-50 shadow-2xl"
                  >
                    <StorageArchivePanel />
                  </motion.div>
                )}
                {activePanel === "thread" && (
                  <motion.div
                    key="mobile-panel-thread"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                      mass: 0.8,
                    }}
                    className="absolute inset-0 bg-white overflow-y-auto z-50 shadow-2xl"
                  >
                    <ThreadPanel />
                  </motion.div>
                )}
              </AnimatePresence>
          </div>
      ) : (
        <>
          <div className="hidden lg:block h-full flex-shrink-0 overflow-hidden">
            <ChannelListWrapper>
              {(width) => <ChannelList width={width} />}
            </ChannelListWrapper>
          </div>

          <div className="flex-1 flex bg-[#f5f6fb] border-x border-[#dbe2ef] min-w-0 overflow-hidden">
            <ChatWindow
              onBack={() => {
                isManualClearRef.current = true; // ✅ Đánh dấu đang clear thủ công
                setSelectedChat(null);
                setSearchParams({});

                // Reset flag sau một chút
                setTimeout(() => {
                  isManualClearRef.current = false;
                }, 100);
              }}
            />
          </div>

          {activePanel === "info" && (
            <motion.div
              initial={false}
              animate={{ x: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              }}
              className="hidden lg:block flex-shrink-0 border-l border-[#dbe2ef] bg-white w-80"
            >
              <ChatInfoPanel />
            </motion.div>
          )}

          {activePanel === "storage" && (
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="hidden lg:block flex-shrink-0 border-l border-[#dbe2ef] w-80 "
            >
              <StorageArchivePanel />
            </motion.div>
          )}

          {activePanel === "search" && (
            <motion.div
              initial={false}
              animate={{ x: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              }}
              className="hidden lg:block flex-shrink-0 border-l border-[#dbe2ef] bg-white w-80 "
            >
              <ChatSearchModal />
            </motion.div>
          )}

          {activePanel === "members" && (
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="hidden lg:block flex-shrink-0 border-l border-[#dbe2ef] w-80"
            >
              <GroupMembersPanel />
            </motion.div>
          )}

          {activePanel === "thread" && (
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="hidden lg:block flex-shrink-0 border-l border-[#dbe2ef] w-[400px]"
            >
              <ThreadPanel />
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
