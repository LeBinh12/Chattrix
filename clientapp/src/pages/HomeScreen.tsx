import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { userAtom } from "../recoil/atoms/userAtom";

import Sidebar from "../components/home/Sidebar";
import ChannelList from "../components/home/ChannelList";
import ChatWindow from "../components/home/ChatWindow";
import ChatInfoPanel from "../components/home/ChatInfoPanel";

import ChannelListWrapper from "../components/home/ChannelListWrapper";
import { chatInfoPanelVisibleAtom } from "../recoil/atoms/uiAtom";
import { selectedChatState } from "../recoil/atoms/chatAtom";
import { motion, AnimatePresence } from "framer-motion";

export default function HomeScreen() {
  const user = useRecoilValue(userAtom);
  const [selectedChat, setSelectedChat] = useRecoilState(selectedChatState);
  const [isPanelVisible, setPanelVisible] = useRecoilState(
    chatInfoPanelVisibleAtom
  );
  const [isCompact, setIsCompact] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      const width = window.innerWidth;
      setViewportWidth(width);
      setIsCompact(width < 1024);

      // Tự động đóng panel khi về mobile/tablet
      if (width < 1024) {
        setPanelVisible(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setPanelVisible]);

  useEffect(() => {
    if (!selectedChat && isPanelVisible) {
      setPanelVisible(false);
    }
  }, [selectedChat, isPanelVisible, setPanelVisible]);

  if (!user) {
    return <div>Không có thông tin người dùng</div>;
  }

  // Handler for group created
  // const handleGroupCreated = () => {
  //   setRefreshGroups((prev) => prev + 1);
  // };

  const compactListWidth = Math.min(
    Math.max(viewportWidth - 80, 240),
    360
  );

  const hideSidebar = isCompact && !!selectedChat;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#dfe6f5]">
      {!hideSidebar && <Sidebar />}
      <div className="flex flex-1 min-w-0 bg-[#e9edf5] overflow-hidden">
        {isCompact ? (
          <div className="flex-1 flex relative overflow-hidden">
            {!selectedChat && !isPanelVisible && (
              <div className="flex-1 flex bg-white overflow-hidden">
                <div className="flex-1 overflow-y-auto border-l border-[#dbe2ef]">
                  <ChannelList width={compactListWidth || 300} />
                </div>
              </div>
            )}

            {selectedChat && (
              <>
                <div className="flex-1 flex bg-[#f5f6fb] border-l border-[#dbe2ef] overflow-hidden">
                  <ChatWindow onBack={() => setSelectedChat(null)} />
                </div>

                <AnimatePresence>
                  {isPanelVisible && (
                    <motion.div
                      key="mobile-panel"
                      initial={{ x: "100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "100%" }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 30,
                        mass: 0.8
                      }}
                      className="absolute inset-0 bg-white overflow-y-auto z-50 shadow-2xl"
                    >
                      <ChatInfoPanel />
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

            <motion.div
              initial={false}
              animate={{ 
                x: isPanelVisible ? 0 : 320
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                mass: 0.8
              }}
              className="hidden lg:block flex-shrink-0 border-l border-[#dbe2ef] bg-white w-80 overflow-y-auto"
              style={{ marginRight: isPanelVisible ? 0 : -320 }}
            >
              <ChatInfoPanel />
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
