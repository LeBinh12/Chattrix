import { useEffect, useState } from "react";
import { useRecoilValue, useRecoilState } from "recoil";
import { userAtom } from "../recoil/atoms/userAtom";
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

export default function HomeScreen() {
  const user = useRecoilValue(userAtom);
  const [selectedChat, setSelectedChat] = useRecoilState(selectedChatState);
  const [activePanel, setActivePanel] = useRecoilState(activePanelAtom);
  const [isCompact, setIsCompact] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setViewportWidth(width);
      setIsCompact(width < 1024);
      if (width < 1024 && activePanel === "info") setActivePanel("none");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activePanel, setActivePanel]);

  if (!user) return <div>Không có thông tin người dùng</div>;

  const compactListWidth = Math.min(Math.max(viewportWidth - 80, 240), 360);

  return (
    <div className="flex flex-1 h-full min-w-0 bg-[#e9edf5] overflow-hidden">
      {isCompact ? (
        <div className="flex-1 flex relative overflow-hidden">
          {!selectedChat && activePanel === "none" && (
            <div className="flex-1 flex bg-white overflow-hidden z-0">
              <div className="flex-1 overflow-y-auto border-l border-[#dbe2ef] ">
                <ChannelList width={compactListWidth} />
              </div>
            </div>
          )}

          {selectedChat && (
            <>
              <div className="flex-1 flex bg-[#f5f6fb] border-l border-[#dbe2ef] overflow-hidden z-1">
                <ChatWindow onBack={() => setSelectedChat(null)} />
              </div>

              <AnimatePresence>
                {activePanel === "info" && (
                  <motion.div
                    key="mobile-panel"
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
              </AnimatePresence>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="hidden lg:block h-full flex-shrink-0 overflow-hidden">
            <ChannelListWrapper>
              {(width) => <ChannelList width={width} />}
            </ChannelListWrapper>
          </div>

          <div className="flex-1 flex bg-[#f5f6fb] border-x border-[#dbe2ef] min-w-0 overflow-hidden">
            <ChatWindow onBack={() => setSelectedChat(null)} />
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
              className="hidden lg:block flex-shrink-0 border-l border-[#dbe2ef] bg-white w-80 overflow-y-auto"
            >
              <ChatInfoPanel />
            </motion.div>
          )}

          {activePanel === "storage" && (
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="hidden lg:block flex-shrink-0 border-l border-[#dbe2ef] w-80 overflow-y-auto"
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
              className="hidden lg:block flex-shrink-0 border-l border-[#dbe2ef] bg-white w-80 overflow-y-auto"
            >
              <ChatSearchModal />
            </motion.div>
            )}
            
            {activePanel === "members" && (
  <motion.div
    initial={{ x: 200, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    className="hidden lg:block flex-shrink-0 border-l border-[#dbe2ef] w-80 overflow-y-auto"
  >
    <GroupMembersPanel />
  </motion.div>
)}
        </>
      )}
    </div>
  );
}
